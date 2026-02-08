/**
 * GHL OAuth token store
 * Stores and retrieves OAuth tokens per location (from Marketplace app installs).
 * Uses Vercel KV for persistence.
 * Uses same redirect URI as authorize/callback for token refresh (oauth-utils).
 */

import { getKV } from '@/lib/kv';
import { getRedirectUri } from './oauth-utils';

const PREFIX = 'ghl:install:';
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh 5 min before expiry

export interface GHLInstallation {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  companyId: string;
  userId: string;
  locationId: string;
  /** Location/company display name (fetched from GHL after install). */
  companyName?: string;
}

function key(locationId: string): string {
  return `${PREFIX}${locationId}`;
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

// #region agent log
function debugLog(message: string, data: Record<string, unknown>) {
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: 'token-store.ts', message, data, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

/**
 * Get installation data for a location (raw, no refresh).
 */
export async function getInstallation(locationId: string): Promise<GHLInstallation | null> {
  const kvKey = key(locationId);
  try {
    const kv = getKV();
    const data = await kv.get<GHLInstallation>(kvKey);
    // #region agent log
    debugLog('getInstallation result', {
      keyPreview: `${kvKey.slice(0, 18)}..${kvKey.slice(-8)}`,
      locationIdLength: locationId.length,
      locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
      hasData: !!data,
      hasAccessToken: !!(data?.accessToken),
      hypothesisId: 'H1-H2',
    });
    // #endregion
    if (!data) {
      console.log('[CQ token-store] getInstallation: no data in KV for', { key: key(locationId).slice(0, 25) + '...', locationIdPreview: locationId.slice(0, 12) + '...' });
    }
    return data ?? null;
  } catch (err) {
    // #region agent log
    debugLog('getInstallation error', {
      keyPreview: `${kvKey.slice(0, 18)}..`,
      locationIdPreview: locationId?.slice(0, 8) + '..',
      err: err instanceof Error ? err.message : String(err),
      hypothesisId: 'H2',
    });
    // #endregion
    console.warn('[CQ token-store] getInstallation error', { locationIdPreview: locationId?.slice(0, 12) + '...', err: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/**
 * Get a valid access token for a location.
 * If not stored, tries to fetch from Agency API (for auto-installed apps when
 * AppInstall webhook is not configured). Requires GHL_AGENCY_ACCESS_TOKEN and
 * GHL_COMPANY_ID. Use this for iframe/locationId flows.
 */
export async function getOrFetchTokenForLocation(locationId: string): Promise<string | null> {
  let token = await getTokenForLocation(locationId);
  if (token) {
    // #region agent log
    debugLog('getOrFetchTokenForLocation: returning token from KV', {
      locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
      hypothesisId: 'H2-H3-H4',
    });
    // #endregion
    return token;
  }

  const companyId = process.env.GHL_COMPANY_ID?.trim();
  if (!companyId) return null;

  try {
    const { getLocationTokenFromAgency } = await import('./agency');
    const result = await getLocationTokenFromAgency(locationId, companyId);
    if (result.success) {
      const out = result.accessToken ?? (await getTokenForLocation(locationId));
      // #region agent log
      debugLog('getOrFetchTokenForLocation: returning token from Agency', {
        locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
        hadAccessToken: !!result.accessToken,
        hypothesisId: 'H1',
      });
      // #endregion
      return out;
    }
  } catch {
    // Fall through to return null
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
