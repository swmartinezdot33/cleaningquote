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

export interface AgencyTokenInstall {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  companyId: string;
}

export interface GHLInstallation {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  companyId: string;
  userId: string;
  locationId: string;
  /** Location/company display name (fetched from GHL after install). */
  companyName?: string;
  /** From token response: Location = location-scoped token (use for contacts); Company = company-scoped (need POST /oauth/locationToken with oauth.write). */
  userType?: 'Location' | 'Company';
}

function key(locationId: string): string {
  return `${PREFIX}${locationId.trim()}`;
}

/**
 * Store GHL OAuth installation (tokens) for a location.
 * Throws on failure so the callback can redirect with an error (no silent failure).
 */
export async function storeInstallation(data: GHLInstallation): Promise<void> {
  const storageKey = key(data.locationId);
  console.log('[CQ token-store] storing', { key: storageKey.slice(0, 30) + '...', hasAccessToken: !!data.accessToken, hasRefreshToken: !!data.refreshToken });
  const kv = getKV();
  await kv.set(storageKey, data, { ex: 365 * 24 * 60 * 60 }); // 1 year (refresh token lifespan)
  console.log('[CQ token-store] stored OK', { locationId: data.locationId.slice(0, 12) + '...' });
}

/**
 * Store the OAuth install token as the Agency token when it's a Company token.
 * For apps with Target User: Agency, the token from the OAuth exchange (user_type=Company) is the
 * Agency Level Token and can be used for POST /oauth/locationToken and GET /oauth/installedLocations.
 * @see GHL: "Handling Access Tokens for Apps with Target User: Agency"
 * @see https://marketplace.gohighlevel.com/docs/ghl/oauth/get-location-access-token
 */
export async function storeAgencyTokenFromInstall(data: AgencyTokenInstall): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(AGENCY_TOKEN_KEY, data, { ex: 365 * 24 * 60 * 60 });
    console.log('[CQ token-store] agency token stored (from OAuth install)');
  } catch (err) {
    console.warn('[CQ token-store] storeAgencyTokenFromInstall failed', err instanceof Error ? err.message : err);
  }
}

/**
 * Get a valid Agency access token (from KV, stored when a Company user completed OAuth install).
 * Used for POST /oauth/locationToken. Refreshes if expired.
 */
export async function getAgencyToken(): Promise<string | null> {
  // #region agent log
  const ingest = (msg: string, d: Record<string, unknown>) => {
    const payload = { location: 'token-store.ts:getAgencyToken', message: msg, data: d, timestamp: Date.now() };
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => {});
    console.log('[CQ-DEBUG]', JSON.stringify(payload));
  };
  // #endregion
  try {
    const kv = getKV();
    const data = await kv.get<AgencyTokenInstall>(AGENCY_TOKEN_KEY);
    if (!data?.accessToken || !data?.refreshToken) {
      // #region agent log
      ingest('agency token null: no data or missing tokens', { hasData: !!data, hasAccess: !!data?.accessToken, hasRefresh: !!data?.refreshToken, hypothesisId: 'H1-H5' });
      // #endregion
      return null;
    }
    const now = Date.now();
    const needsRefresh = data.expiresAt - REFRESH_BUFFER_MS <= now;
    if (!needsRefresh) {
      // #region agent log
      ingest('agency token from KV (not refreshed)', { tokenLength: data.accessToken.length, hypothesisId: 'H1-H5' });
      // #endregion
      return data.accessToken;
    }
    const refreshed = await refreshAgencyToken(data);
    const out = refreshed?.accessToken ?? null;
    // #region agent log
    ingest('agency token after refresh', { refreshed: !!refreshed, tokenLength: out?.length ?? 0, hypothesisId: 'H3' });
    // #endregion
    return out;
  } catch (e) {
    // #region agent log
    ingest('getAgencyToken throw', { err: e instanceof Error ? e.message : String(e), hypothesisId: 'H1-H5' });
    // #endregion
    return null;
  }
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
 */
export async function getInstallation(locationId: string): Promise<GHLInstallation | null> {
  const kvKey = key(locationId);
  console.log('[CQ token-store] KV lookup', { kvKey, locationId, result: 'checking...' });
  try {
    const kv = getKV();
    const data = await kv.get<GHLInstallation>(kvKey);
    console.log('[CQ token-store] KV result', { kvKey, found: !!data, hasToken: !!data?.accessToken });
    // #region agent log
    debugLog('getInstallation result', {
      keyPreview: `${kvKey.slice(0, 18)}..${kvKey.slice(-8)}`,
      locationIdLength: locationId.length,
      locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
      hasData: !!data,
      hasAccessToken: !!(data?.accessToken),
      storedVsRequested: data?.locationId === locationId,
      storedLocationIdPreview: data?.locationId ? `${data.locationId.slice(0, 8)}..${data.locationId.slice(-4)}` : null,
      hypothesisId: 'H1-H2-H4',
    });
    // #endregion
    return data ?? null;
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
 * Get the location access token to use for contacts and all location-scoped GHL calls.
 * Flow: we have the access token from OAuth → use it to get location token (POST /oauth/locationToken) → return that.
 * We never use the company/agency token for contacts; only the location token.
 */
export async function getOrFetchTokenForLocation(locationId: string): Promise<string | null> {
  const companyId = process.env.GHL_COMPANY_ID?.trim();
  const hasAgencyToken = !!(await getAgencyToken());

  // #region agent log
  debugLog('getOrFetchTokenForLocation: agency path check', {
    hasAgencyToken,
    hasCompanyId: !!companyId,
    locationIdPreview: locationId.slice(0, 8) + '..' + locationId.slice(-4),
    hypothesisId: 'H1-H2-H5',
  });
  // #endregion
  // Use our access token to get location access token (POST /oauth/locationToken); then use that for contacts etc.
  if (hasAgencyToken && companyId) {
    try {
      const { getLocationTokenFromAgency } = await import('./agency');
      const result = await getLocationTokenFromAgency(locationId, companyId, { skipStore: false });
      // #region agent log
      debugLog('getOrFetchTokenForLocation: locationToken result', {
        success: result.success,
        error: result.error ?? null,
        hasAccessToken: !!result.accessToken,
        hypothesisId: 'H1-H5',
      });
      // #endregion
      if (result.success && result.accessToken) {
        debugLog('getOrFetchTokenForLocation: returning location token from Agency', {
          locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
          hypothesisId: 'location-token-for-contacts',
        });
        return result.accessToken;
      }
      // 401 "not authorized for this scope" = token lacks oauth.write. We have an agency token, so the token
      // in KV for this locationId is the company token — never use it for location APIs (causes "authClass type not allowed").
      const isScopeError = result.error && /scope|authorized/i.test(result.error);
      if (isScopeError) {
        console.warn('[CQ token-store] POST /oauth/locationToken returned 401 scope; not using KV token (would be company token). Add oauth.write in GHL Marketplace or connect as Location user.');
        return null;
      }
    } catch (e) {
      // #region agent log
      debugLog('getOrFetchTokenForLocation: getLocationTokenFromAgency threw', { err: e instanceof Error ? e.message : String(e), hypothesisId: 'H4' });
      // #endregion
      // Fall through to KV only if we didn't get a scope error (e.g. network failure)
    }
  }

  // No agency path, or locationToken succeeded: use token from KV (Location user install = location-scoped only).
  const token = await getTokenForLocation(locationId);
  if (token) {
    debugLog('getOrFetchTokenForLocation: returning token from KV', {
      locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
      hypothesisId: 'H2-H3-H4',
    });
    return token;
  }

  return null;
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

/**
 * Refresh access token using refresh token.
 */
async function refreshAccessToken(
  locationId: string,
  install: GHLInstallation
): Promise<GHLInstallation | null> {
  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;
  const redirectUri = getRedirectUri(); // Same as authorize/callback for token refresh

  if (!clientId || !clientSecret || !redirectUri) {
    console.error('GHL OAuth: Missing GHL_CLIENT_ID, GHL_CLIENT_SECRET, or GHL_REDIRECT_URI');
    return null;
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: install.refreshToken,
      user_type: 'Location',
      redirect_uri: redirectUri,
    });

    const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
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
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? install.refreshToken,
      expiresAt,
      companyId: data.companyId ?? install.companyId,
      userId: data.userId ?? install.userId,
      locationId: data.locationId ?? locationId,
      companyName: install.companyName,
    };

    await storeInstallation(updated);
    return updated;
  } catch (err) {
    console.error('GHL OAuth refresh error:', err);
    return null;
  }
}
