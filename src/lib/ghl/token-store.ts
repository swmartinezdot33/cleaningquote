/**
 * GHL OAuth token store
 * Stores and retrieves OAuth tokens per location (from Marketplace app installs).
 * Uses Vercel KV for persistence.
 * Uses same redirect URI as authorize/callback for token refresh (oauth-utils).
 */

import { getKV } from '@/lib/kv';
import { getRedirectUri } from './oauth-utils';

const PREFIX = 'ghl:install:';
const AGENCY_TOKEN_KEY = 'ghl:agency:token';
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

/** Normalize locationId for storage and lookup (single source of truth). */
export function normalizeLocationId(locationId: string): string {
  return String(locationId).trim();
}

/** Canonical KV key for a location's install. Use everywhere we read/write by locationId. */
export function installKey(locationId: string): string {
  return `${PREFIX}${normalizeLocationId(locationId)}`;
}

/** Agency data stored at ghl:agency:token: Agency Access Token, Agency Refresh Token, Company ID. Required for agency calls (POST /oauth/locationToken, GET /oauth/installedLocations). */
export interface AgencyTokenInstall {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  companyId: string;
}

/** Full OAuth callback response (Location OAuth Access Token = access_token). Stored per locationId. */
export interface GHLOAuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  company_id?: string;
  companyId?: string;
  location_id?: string;
  locationId?: string;
  scope?: string;
  user_type?: string;
  userType?: string;
  user_id?: string;
  userId?: string;
  token_type?: string;
  [key: string]: unknown;
}

/** Full POST /oauth/locationToken response (Location Access Token = access_token). Used for Get Contacts etc. */
export interface GHLLocationTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  locationId?: string;
  companyId?: string;
  userType?: string;
  [key: string]: unknown;
}

/** Stored value at ghl:install:{locationId}. Includes full OAuth + locationToken responses; accessToken is the Location Access Token for API calls. */
export interface GHLInstallation {
  locationId: string;
  /** Location Access Token (from POST /oauth/locationToken) — use for Get Contacts and all location-scoped calls. */
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userType?: 'Location' | 'Company';
  /** True when this location has completed OAuth and we have Location Access Token. */
  oauth_connected?: boolean;
  /** Full OAuth callback response (Location OAuth Access Token). Used to call POST /oauth/locationToken when needed. */
  oauth_response?: GHLOAuthResponse;
  oauth_expires_at?: number;
  /** Full POST /oauth/locationToken response. accessToken above is from this. */
  location_token_response?: GHLLocationTokenResponse;
}

function key(locationId: string): string {
  return installKey(locationId);
}

/**
 * Store token for a location. Key = installKey(locationId). Value includes locationId for verification.
 */
export async function storeInstallation(data: {
  locationId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userType?: 'Location' | 'Company';
  oauth_connected?: boolean;
  oauth_response?: GHLOAuthResponse;
  oauth_expires_at?: number;
  location_token_response?: GHLLocationTokenResponse;
}): Promise<void> {
  const locationId = normalizeLocationId(data.locationId);
  const storageKey = installKey(locationId);
  const value: GHLInstallation = {
    locationId,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt,
    userType: data.userType ?? 'Location',
    oauth_connected: data.oauth_connected ?? false,
    oauth_response: data.oauth_response,
    oauth_expires_at: data.oauth_expires_at,
    location_token_response: data.location_token_response,
  };
  const kv = getKV();
  await kv.set(storageKey, value, { ex: 365 * 24 * 60 * 60 });
  console.log('[CQ token-store] stored', { key: storageKey, locationId, userType: value.userType, oauth_connected: value.oauth_connected });
}

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/**
 * Call POST /oauth/locationToken with Location OAuth Access Token as Bearer. Returns full response (Location Access Token = access_token).
 */
export async function fetchLocationTokenFromOAuth(
  locationId: string,
  companyId: string,
  oauthAccessToken: string
): Promise<{ success: boolean; data?: GHLLocationTokenResponse; error?: string }> {
  try {
    const body = new URLSearchParams({ companyId: companyId.trim(), locationId: normalizeLocationId(locationId) });
    const res = await fetch(`${GHL_API_BASE}/oauth/locationToken`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${oauthAccessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Version: '2021-07-28',
      },
      body: body.toString(),
    });
    const data = (await res.json().catch(() => ({}))) as GHLLocationTokenResponse & { error?: string; message?: string };
    if (!res.ok) {
      const err = data.error ?? data.message ?? `GHL ${res.status}`;
      return { success: false, error: err };
    }
    if (!data.access_token) return { success: false, error: 'No access_token in response' };
    return { success: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

/**
 * Store full OAuth callback response + Location Access Token response for a location.
 * Location OAuth Access Token = oauth_response.access_token (used as Bearer for POST /oauth/locationToken).
 * Location Access Token = location_token_response.access_token (used for Get Contacts etc.).
 */
export async function storeLocationOAuthAndToken(
  locationId: string,
  oauthResponse: GHLOAuthResponse,
  locationTokenResponse: GHLLocationTokenResponse
): Promise<void> {
  const locId = normalizeLocationId(locationId);
  const oauthExpiresAt = oauthResponse.expires_in != null
    ? Date.now() + oauthResponse.expires_in * 1000
    : Date.now() + 86400 * 1000;
  const tokenExpiresAt = locationTokenResponse.expires_in != null
    ? Date.now() + locationTokenResponse.expires_in * 1000
    : Date.now() + 86400 * 1000;
  await storeInstallation({
    locationId: locId,
    accessToken: locationTokenResponse.access_token,
    refreshToken: locationTokenResponse.refresh_token ?? '',
    expiresAt: tokenExpiresAt,
    userType: 'Location',
    oauth_connected: true,
    oauth_response: oauthResponse,
    oauth_expires_at: oauthExpiresAt,
    location_token_response: locationTokenResponse,
  });
}

/**
 * Store Agency data: Agency Access Token, Agency Refresh Token, Company ID.
 * Required for agency calls: get Location Access Token (POST /oauth/locationToken), get installed locations (GET /oauth/installedLocations).
 * Called when a Company (Agency) user completes OAuth; token response includes companyId.
 */
export async function storeAgencyTokenFromInstall(data: AgencyTokenInstall): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(AGENCY_TOKEN_KEY, data, { ex: 365 * 24 * 60 * 60 });
    console.log('[CQ token-store] agency stored', { hasAccessToken: !!data.accessToken, hasRefreshToken: !!data.refreshToken, companyId: data.companyId ? `${data.companyId.slice(0, 8)}..` : null });
  } catch (err) {
    console.warn('[CQ token-store] storeAgencyTokenFromInstall failed', err instanceof Error ? err.message : err);
  }
}

/**
 * Get full Agency install from KV (Access Token, Refresh Token, Company ID). Refreshes access token if expired.
 * Use for agency calls: POST /oauth/locationToken (need token + companyId), GET /oauth/installedLocations (need token + companyId).
 */
export async function getAgencyInstall(): Promise<AgencyTokenInstall | null> {
  try {
    const kv = getKV();
    const data = await kv.get<AgencyTokenInstall>(AGENCY_TOKEN_KEY);
    if (!data?.accessToken || !data?.refreshToken) return null;
    const now = Date.now();
    const needsRefresh = data.expiresAt - REFRESH_BUFFER_MS <= now;
    if (!needsRefresh) return data;
    const refreshed = await refreshAgencyToken(data);
    return refreshed ?? data;
  } catch {
    return null;
  }
}

/**
 * Get a valid Agency access token (from KV). Refreshes if expired. Prefer getAgencyInstall() when you need companyId too.
 */
export async function getAgencyToken(): Promise<string | null> {
  const install = await getAgencyInstall();
  return install?.accessToken ?? null;
}

async function refreshAgencyToken(install: AgencyTokenInstall): Promise<AgencyTokenInstall | null> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = getRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) return null;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: install.refreshToken,
      user_type: 'Company',
      redirect_uri: redirectUri,
    });
    const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('GHL OAuth agency refresh failed:', res.status, data);
      return null;
    }
    const next: AgencyTokenInstall = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? install.refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 86400) * 1000,
      companyId: data.companyId ?? install.companyId,
    };
    await storeAgencyTokenFromInstall(next);
    return next;
  } catch (err) {
    console.error('GHL OAuth agency refresh error:', err);
    return null;
  }
}

// #region agent log
function debugLog(message: string, data: Record<string, unknown>) {
  const payload = { location: 'token-store.ts', message, data, timestamp: Date.now() };
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
  console.log('[CQ-DEBUG]', JSON.stringify(payload));
}
// #endregion

/**
 * Get installation data for a location (raw, no refresh).
 * Hard fail on locationId mismatch: if stored record's locationId !== requested, return null (no cross-location reuse).
 */
export async function getInstallation(locationId: string): Promise<GHLInstallation | null> {
  const normalized = normalizeLocationId(locationId);
  const kvKey = installKey(normalized);
  console.log('[CQ token-store] KV lookup', { kvKey, locationId: normalized, result: 'checking...' });
  try {
    const kv = getKV();
    const data = await kv.get<GHLInstallation & { locationId?: string }>(kvKey);
    const resolved = data ? { ...data, locationId: data.locationId ?? normalized } : null;
    const storedLocationId = resolved?.locationId ? normalizeLocationId(resolved.locationId) : '';
    const match = storedLocationId === normalized;
    if (data && resolved && !match) {
      console.warn('[CQ token-store] KV value.locationId !== requested (hard fail)', { stored: resolved.locationId, requested: normalized });
      return null;
    }
    console.log('[CQ token-store] KV result', { kvKey, found: !!resolved, hasToken: !!resolved?.accessToken, locationIdMatch: match });
    // #region agent log
    debugLog('getInstallation result', {
      kvKey,
      locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
      hasData: !!data,
      hasAccessToken: !!(data?.accessToken),
      userType: data?.userType ?? null,
      hypothesisId: 'H1-H2-H4',
    });
    // #endregion
    return resolved ?? null;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const kvNotConfigured = /KV_REST_API|required|not configured/i.test(errMsg);
    // #region agent log
    debugLog('getInstallation error', {
      keyPreview: `${kvKey.slice(0, 18)}..`,
      locationIdPreview: locationId?.slice(0, 8) + '..',
      err: errMsg,
      kvNotConfigured,
      hypothesisId: 'H2',
    });
    // #endregion
    console.warn('[CQ token-store] getInstallation error', { locationIdPreview: locationId?.slice(0, 12) + '...', err: errMsg, kvNotConfigured });
    return null;
  }
}

/**
 * Get the Location Access Token for this location (for Get Contacts and all location-scoped GHL calls).
 * Token comes from KV: stored by callback after POST /oauth/locationToken. Refreshes if expired.
 */
export async function getOrFetchTokenForLocation(locationId: string): Promise<string | null> {
  const normalizedLocationId = normalizeLocationId(locationId);
  const token = await getTokenForLocation(normalizedLocationId);
  return token ?? null;
}

/**
 * Get a valid access token for a location (no auto-fetch).
 * Refreshes the token if it's expired or about to expire.
 */
export async function getTokenForLocation(locationId: string): Promise<string | null> {
  const install = await getInstallation(locationId);
  if (!install) {
    // #region agent log
    debugLog('getTokenForLocation: no install', { locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`, hypothesisId: 'H2' });
    // #endregion
    return null;
  }

  const now = Date.now();
  const needsRefresh = install.expiresAt - REFRESH_BUFFER_MS <= now;

  if (!needsRefresh) {
    return install.accessToken;
  }

  // Refresh the token
  const refreshed = await refreshAccessToken(locationId, install);
  // #region agent log
  debugLog('getTokenForLocation after refresh', {
    locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
    needsRefresh,
    refreshOk: !!refreshed,
    hypothesisId: 'H3',
  });
  // #endregion
  if (!refreshed) return null;

  return refreshed.accessToken;
}

const GHL_OAUTH_TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

/** Legacy single-step refresh when install has no oauth_response (e.g. pre–two-step installs). */
async function refreshAccessTokenLegacy(
  locationId: string,
  install: GHLInstallation
): Promise<GHLInstallation | null> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = getRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) return null;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: install.refreshToken,
      user_type: install.userType === 'Company' ? 'Company' : 'Location',
      redirect_uri: redirectUri,
    });
    const res = await fetch(GHL_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('GHL OAuth refresh failed:', res.status, data);
      return null;
    }
    const expiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;
    const updated: GHLInstallation = {
      locationId: normalizeLocationId(locationId),
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? install.refreshToken,
      expiresAt,
      userType: install.userType,
      oauth_connected: install.oauth_connected,
      oauth_response: install.oauth_response,
      oauth_expires_at: install.oauth_expires_at,
      location_token_response: install.location_token_response,
    };
    await storeInstallation(updated);
    return updated;
  } catch (err) {
    console.error('GHL OAuth refresh error:', err);
    return null;
  }
}

/**
 * Two-step refresh: (1) refresh Location OAuth token if expired, (2) re-exchange for Location Access Token.
 * If only Location Access Token is expired and OAuth is still valid, skips step 1.
 * All reads/writes are KV only.
 */
async function refreshAccessToken(
  locationId: string,
  install: GHLInstallation
): Promise<GHLInstallation | null> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = getRedirectUri();

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('GHL OAuth: Missing GHL_CLIENT_ID, GHL_CLIENT_SECRET, or GHL_REDIRECT_URI');
    return null;
  }

  let oauthResponse = install.oauth_response;
  let oauthExpiresAt = install.oauth_expires_at ?? 0;
  const now = Date.now();
  const oauthExpired = !oauthResponse?.access_token || oauthExpiresAt - REFRESH_BUFFER_MS <= now;

  // Legacy: no oauth_response — refresh Location token directly and return.
  if (!oauthResponse?.access_token) {
    const legacy = await refreshAccessTokenLegacy(locationId, install);
    return legacy;
  }

  // Step 1: If Location OAuth token is expired (or missing), refresh it via GHL /oauth/token.
  if (oauthExpired && oauthResponse?.refresh_token) {
    try {
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
        refresh_token: oauthResponse.refresh_token,
        user_type: install.userType === 'Company' ? 'Company' : 'Location',
        redirect_uri: redirectUri,
      });
      const res = await fetch(GHL_OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: body.toString(),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('GHL OAuth (Location) refresh failed:', res.status, data);
        return null;
      }
      oauthResponse = data as GHLOAuthResponse;
      oauthExpiresAt = Date.now() + (oauthResponse.expires_in ?? 86400) * 1000;
      await storeInstallation({
        locationId: normalizeLocationId(locationId),
        accessToken: install.accessToken,
        refreshToken: install.refreshToken,
        expiresAt: install.expiresAt,
        userType: install.userType,
        oauth_connected: install.oauth_connected,
        oauth_response: oauthResponse,
        oauth_expires_at: oauthExpiresAt,
        location_token_response: install.location_token_response,
      });
    } catch (err) {
      console.error('GHL OAuth (Location) refresh error:', err);
      return null;
    }
  } else if (oauthExpired && !oauthResponse?.refresh_token) {
    console.error('GHL OAuth: Location OAuth expired and no refresh_token; cannot refresh');
    return null;
  }

  // Step 2: Re-exchange for Location Access Token via POST /oauth/locationToken.
  const oauthAccessToken = oauthResponse?.access_token;
  if (!oauthAccessToken) {
    console.error('GHL OAuth: No Location OAuth access_token for re-exchange');
    return null;
  }
  const companyId =
    (oauthResponse?.company_id ?? oauthResponse?.companyId ?? '') ||
    (process.env.GHL_COMPANY_ID ?? '').trim();

  const locationTokenResult = await fetchLocationTokenFromOAuth(
    locationId,
    companyId,
    oauthAccessToken
  );

  if (!locationTokenResult.success || !locationTokenResult.data) {
    console.error('GHL OAuth: POST /oauth/locationToken failed after refresh', {
      error: locationTokenResult.error,
      locationId: locationId.slice(0, 12) + '..',
    });
    return null;
  }

  const locToken = locationTokenResult.data;
  const tokenExpiresAt =
    locToken.expires_in != null
      ? Date.now() + locToken.expires_in * 1000
      : Date.now() + 86400 * 1000;

  const updated: GHLInstallation = {
    locationId: normalizeLocationId(locationId),
    accessToken: locToken.access_token,
    refreshToken: locToken.refresh_token ?? install.refreshToken,
    expiresAt: tokenExpiresAt,
    userType: install.userType,
    oauth_connected: install.oauth_connected ?? true,
    oauth_response: oauthResponse,
    oauth_expires_at: oauthExpiresAt,
    location_token_response: locToken,
  };
  await storeInstallation(updated);
  return updated;
}
