/**
 * GHL Agency-level API operations.
 * For locationToken and installedLocations we use the OAuth Access Token (Company) as the Agency token — never GHL_AGENCY_ACCESS_TOKEN.
 * createGHLSubAccount (Stripe) may use env token when creating locations.
 */

import { storeInstallation } from './token-store';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

export interface CreateSubAccountInput {
  name: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  stripeCustomerId?: string;
}

export interface CreateSubAccountResult {
  success: boolean;
  locationId?: string;
  error?: string;
}

/**
 * Create a GHL sub-account (location) under the agency.
 * Requires Agency Pro plan. Uses GHL_AGENCY_ACCESS_TOKEN and GHL_COMPANY_ID.
 */
export async function createGHLSubAccount(input: CreateSubAccountInput): Promise<CreateSubAccountResult> {
  const token = process.env.GHL_AGENCY_ACCESS_TOKEN?.trim();
  const companyId = process.env.GHL_COMPANY_ID?.trim();

  if (!token || !companyId) {
    return { success: false, error: 'GHL_AGENCY_ACCESS_TOKEN and GHL_COMPANY_ID must be set' };
  }

  try {
    const body: Record<string, unknown> = {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      companyId,
    };
    if (input.phone?.trim()) body.phone = input.phone.trim();
    if (input.firstName?.trim()) body.firstName = input.firstName.trim();
    if (input.lastName?.trim()) body.lastName = input.lastName.trim();

    const res = await fetch(`${GHL_API_BASE}/locations/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('GHL create location failed:', res.status, data);
      return {
        success: false,
        error: (data as { message?: string }).message ?? (data as { error?: string }).error ?? `GHL API ${res.status}`,
      };
    }

    const locationId = (data as { location?: { id?: string } }).location?.id
      ?? (data as { id?: string }).id;

    if (!locationId) {
      console.error('GHL create location: no locationId in response', data);
      return { success: false, error: 'No location ID in GHL response' };
    }

    return { success: true, locationId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GHL create location error:', err);
    return { success: false, error: msg };
  }
}

export interface LocationTokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

/** Location shape from GET /oauth/installedLocations (highlevel-api-docs: InstalledLocationSchema has _id, name, address) */
export interface InstalledLocation {
  _id?: string;
  id?: string;
  name?: string;
  address?: string;
  isInstalled?: boolean;
  [key: string]: unknown;
}

/**
 * Step 2: Use the access token to see which location(s) the app was installed in.
 * GET /oauth/installedLocations (companyId and appId required). Uses stored Agency token + Company ID when available.
 */
export async function getInstalledLocations(options?: { companyId?: string; appId?: string }): Promise<{ success: boolean; locations?: InstalledLocation[]; error?: string }> {
  const { getAgencyInstall } = await import('./token-store');
  const agencyInstall = await getAgencyInstall();
  const token = agencyInstall?.accessToken ?? null;
  if (!token) {
    return { success: false, error: 'No agency token. Install the app as Agency (Target User: Agency); the OAuth Access Token from that install is the Agency token.' };
  }
  const companyId = options?.companyId?.trim() ?? agencyInstall?.companyId?.trim() ?? process.env.GHL_COMPANY_ID?.trim();
  const appId = options?.appId?.trim() ?? process.env.GHL_CLIENT_ID?.trim();
  if (!companyId || !appId) {
    return { success: false, error: 'GHL_COMPANY_ID and GHL_CLIENT_ID required for GET /oauth/installedLocations' };
  }
  try {
    const params = new URLSearchParams({ companyId, appId });
    const url = `${GHL_API_BASE}/oauth/installedLocations?${params.toString()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        Version: '2021-07-28',
      },
    });
    const data = (await res.json().catch(() => ({}))) as { locations?: InstalledLocation[]; location?: InstalledLocation[]; error?: string; message?: string };
    if (!res.ok) {
      return { success: false, error: data.error ?? data.message ?? `GHL API ${res.status}` };
    }
    const locations = data.locations ?? data.location ?? [];
    return { success: true, locations: Array.isArray(locations) ? locations : [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Get a Location-level access token from the Agency token.
 * API 2.0: POST /oauth/locationToken requires Agency token with scope oauth.write.
 * @see https://github.com/GoHighLevel/highlevel-api-docs (docs/oauth/Scopes.md: oauth.write → POST /oauth/locationToken | Agency)
 * @see https://marketplace.gohighlevel.com/docs/ghl/oauth/get-location-access-token
 * @param options.skipStore - If true, do not persist to KV (e.g. when using agency-only for dashboard).
 */
// #region agent log
function agencyDebugLog(message: string, data: Record<string, unknown>) {
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: 'agency.ts', message, data, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

/**
 * Resolve the Agency Access Token for POST /oauth/locationToken.
 * Uses stored Agency install (OAuth Company) — never GHL_AGENCY_ACCESS_TOKEN.
 */
async function getAgencyTokenForLocationToken(): Promise<string | null> {
  const { getAgencyToken } = await import('./token-store');
  return await getAgencyToken();
}

/**
 * Step 3: Get Location Access Token using the Agency Access Token.
 * POST /oauth/locationToken expects Bearer = Agency (Company) token; companyId from stored agency install when not passed.
 */
export async function getLocationTokenFromAgency(
  locationId: string,
  companyIdOrOptional?: string,
  options?: { skipStore?: boolean }
): Promise<LocationTokenResult> {
  const { getAgencyInstall } = await import('./token-store');
  const agencyInstall = await getAgencyInstall();
  const token = agencyInstall?.accessToken ?? (await getAgencyTokenForLocationToken());
  if (!token) {
    agencyDebugLog('getLocationTokenFromAgency: no agency token (install app as Agency so OAuth returns Company token)', { hypothesisId: 'H1' });
    return { success: false, error: 'No agency token. Install the app as Agency (Target User: Agency); the OAuth Access Token from that install is the Agency token.' };
  }
  const companyId = companyIdOrOptional?.trim() ?? agencyInstall?.companyId?.trim() ?? process.env.GHL_COMPANY_ID?.trim();
  if (!companyId) {
    return { success: false, error: 'Company ID required for POST /oauth/locationToken. Install as Agency (Company) so we store Company ID, or set GHL_COMPANY_ID.' };
  }

  try {
    const body = new URLSearchParams({
      companyId,
      locationId,
    });

    const res = await fetch(`${GHL_API_BASE}/oauth/locationToken`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Version: '2021-07-28',
      },
      body: body.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      locationId?: string;
      companyId?: string;
      userId?: string;
      error?: string;
      message?: string;
      statusCode?: number;
    };

    if (!res.ok) {
      const errMsg = data.error ?? data.message ?? `GHL API ${res.status}`;
      agencyDebugLog('getLocationTokenFromAgency: GHL API error', { status: res.status, error: errMsg, endpoint: '/oauth/locationToken', hypothesisId: 'H2-H3-H5' });
      console.error('GHL locationToken failed:', res.status, data);
      const isScopeError = res.status === 401 && (errMsg.includes('scope') || errMsg.includes('authorized'));
      if (isScopeError) {
        console.error(
          '[CQ Agency] POST /oauth/locationToken requires Agency token with oauth.write scope. ' +
          'Add oauth.write to your app scopes in GHL Marketplace. API 2.0: https://github.com/GoHighLevel/highlevel-api-docs (docs/oauth/Scopes.md)'
        );
      }
      return {
        success: false,
        error: isScopeError
          ? `${errMsg}. Add oauth.write scope to your Agency app (GHL Marketplace → App → Scopes). See https://github.com/GoHighLevel/highlevel-api-docs docs/oauth/Scopes.md`
          : errMsg,
      };
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    if (!accessToken || !refreshToken) {
      return { success: false, error: 'No access_token or refresh_token in response' };
    }

    const expiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;

    // Store location access token in KV for this locationId so we can make all GHL calls for the location.
    // @see https://marketplace.gohighlevel.com/docs/ghl/oauth/get-location-access-token
    if (!options?.skipStore) {
      try {
        const locId = data.locationId ?? locationId;
        await storeInstallation({
          locationId: locId,
          accessToken,
          refreshToken,
          expiresAt,
          userType: 'Location',
        });
        console.log('[CQ Agency] stored location token in KV', { locationId: locId.slice(0, 12) + '..' });
      } catch (storeErr) {
        console.warn('[CQ Agency] store location token in KV failed (will use token for this request only)', storeErr instanceof Error ? storeErr.message : storeErr);
      }
    }

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GHL getLocationTokenFromAgency error:', err);
    return { success: false, error: msg };
  }
}
