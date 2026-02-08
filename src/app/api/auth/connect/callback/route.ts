/**
 * OAuth callback for marketplace app install.
 * CALLBACK URL: https://www.cleanquote.io/api/auth/connect/callback
 * GHL redirects here with ?code=...&state=... . We exchange for tokens, store in KV, then
 * return an HTML success page on THIS URL (no redirect) with proof: locationId + token stored.
 */

import { NextRequest, NextResponse } from 'next/server';
import { storeInstallation, getInstallation, storeAgencyTokenFromInstall } from '@/lib/ghl/token-store';
import { createSessionToken } from '@/lib/ghl/session';
import { setOrgGHLOAuth } from '@/lib/config/store';
import { getRedirectUri, getPostOAuthRedirectBase } from '@/lib/ghl/oauth-utils';
import { fetchLocationName } from '@/lib/ghl/location-info';

const LOG = '[CQ Connect Callback]';

function htmlSuccess(
  locationId: string,
  accessTokenLength: number,
  refreshTokenLength: number,
  companyName?: string,
  source?: string,
  stateDebug?: string,
  debug?: { tokenResponseKeys: string; userType: string; locationIdInBody: boolean; stateHadLocationId: boolean; locationIdFromStatePreview: string; locationSource: string }
) {
  const safeLocationId = locationId.replace(/[<>"']/g, '');
  const safeCompany = (companyName ?? '').replace(/[<>"']/g, '');
  const sourceNote = source ? ` <span class="source">(${source})</span>` : '';
  const multiLocationWarning = source === 'token_or_api' ? '<p class="row warn">You have multiple locations. This was stored under the location returned by GHL. To connect a specific location, open that location in GHL and use Connect from the app there.</p>' : '';
  const stateDebugRow = stateDebug ? `<div class="row debug">${stateDebug}</div>` : '';
  const debugSection = debug
    ? `<details class="row debug" style="margin-top:1rem;"><summary style="cursor:pointer;font-weight:600;">Debug — why this location</summary><pre style="font-size:0.75rem;overflow:auto;margin-top:0.5rem;padding:0.5rem;background:#f0f0f0;border-radius:4px;">${[
        `Token response keys: ${debug.tokenResponseKeys}`,
        `userType: ${debug.userType}`,
        `locationId in token body: ${debug.locationIdInBody ? 'yes' : 'no'}`,
        `State had locationId: ${debug.stateHadLocationId}${debug.locationIdFromStatePreview ? ` (${debug.locationIdFromStatePreview})` : ''}`,
        `Source used: ${debug.locationSource}`,
      ].join('\n')}</pre></details>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>OAuth callback — success | CleanQuote</title>
<style>
  body { font-family: system-ui,sans-serif; max-width: 560px; margin: 2rem auto; padding: 1rem; background: #f5f5f5; }
  .card { background: #fff; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
  h1 { color: #166534; font-size: 1.25rem; margin: 0 0 0.5rem 0; }
  .row { margin: 0.5rem 0; }
  .label { font-weight: 600; color: #374151; }
  .value { font-family: monospace; word-break: break-all; }
  .ok { color: #15803d; }
  .source { font-size: 0.9em; color: #6b7280; font-weight: normal; }
  .warn { color: #b45309; }
  .debug { font-size: 0.85em; color: #6b7280; margin-top: 0.75rem; }
</style>
</head>
<body>
  <div class="card">
    <h1>Callback URL worked</h1>
    <p>This is the OAuth callback. Tokens were exchanged and stored in KV.</p>
    <div class="row"><span class="label">Location ID:</span> <span class="value">${safeLocationId}</span>${sourceNote}</div>
    <div class="row"><span class="label">Token in KV:</span> <span class="ok">stored</span> (access length: ${accessTokenLength}, refresh length: ${refreshTokenLength})</div>
    ${safeCompany ? `<div class="row"><span class="label">Company:</span> ${safeCompany}</div>` : ''}
    ${stateDebugRow}
    ${multiLocationWarning}
    ${debugSection}
    <p class="row"><a href="/dashboard" style="color:#166534;font-weight:600;">Continue to Dashboard</a></p>
  </div>
</body>
</html>`;
}

function htmlError(title: string, message: string, errorCode?: string): string {
  const safeTitle = title.replace(/[<>"']/g, '');
  const safeMsg = message.replace(/[<>"']/g, '');
  const code = (errorCode ?? '').replace(/[<>"']/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>OAuth callback — error | CleanQuote</title>
<style>
  body { font-family: system-ui,sans-serif; max-width: 560px; margin: 2rem auto; padding: 1rem; background: #fef2f2; }
  .card { background: #fff; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,.1); border-left: 4px solid #dc2626; }
  h1 { color: #b91c1c; font-size: 1.25rem; margin: 0 0 0.5rem 0; }
  p { margin: 0.5rem 0; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
</style>
</head>
<body>
  <div class="card">
    <h1>${safeTitle}</h1>
    <p>${safeMsg}</p>
    ${code ? `<p><code>${code}</code></p>` : ''}
  </div>
</body>
</html>`;
}

const TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const API_BASE = 'https://services.leadconnectorhq.com';

/** Try to get locationId from JWT payload. Use only explicit locationId/location_id — do NOT use authClassId (can be company id for Company-scoped tokens). */
function getLocationIdFromJwt(accessToken: string): string | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    const locationId = (parsed.locationId as string) ?? (parsed.location_id as string) ?? null;
    // Only use explicit locationId/location_id from JWT. Do NOT use authClassId — for Company tokens it can be company/parent id (e.g. "CleanQuote.io") not the sub-account location ("CleanQuote.io Snapshot").
    const id = locationId ?? null;
    return typeof id === 'string' && id.length > 5 ? id : null;
  } catch {
    return null;
  }
}

async function fetchLocationFromToken(accessToken: string, companyId: string): Promise<string | null> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Version: '2021-04-15',
    'Content-Type': 'application/json',
  };

  // 1. Try /locations/ (list for token's scope)
  const locRes = await fetch(`${API_BASE}/locations/`, { headers });
  if (locRes.ok) {
    const locData = await locRes.json();
    const locs = locData.locations ?? locData.data?.locations ?? (Array.isArray(locData) ? locData : []);
    const arr = Array.isArray(locs) ? locs : [locs];
    const first = arr[0];
    if (first) {
      const id = first.id ?? first.locationId ?? first.location_id;
      if (id) return String(id);
    }
  }

  // 2. Try /locations/search (alternative list endpoint)
  if (companyId) {
    const searchRes = await fetch(`${API_BASE}/locations/search?companyId=${companyId}`, { headers });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const locs = searchData.locations ?? searchData.data?.locations ?? (Array.isArray(searchData) ? searchData : []);
      const arr = Array.isArray(locs) ? locs : [locs];
      const first = arr[0];
      if (first) {
        const id = first.id ?? first.locationId ?? first.location_id;
        if (id) return String(id);
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  // Parse state for redirect, orgId, and locationId (used when token response has no locationId — e.g. Company-level install)
  let redirectTo = '/dashboard';
  let orgId: string | null = null;
  let locationIdFromState: string | null = null;
  if (stateRaw) {
    const tryParse = (decoded: string): void => {
      try {
        const parsed = JSON.parse(decoded);
        if (parsed.redirect) redirectTo = parsed.redirect;
        if (parsed.orgId) orgId = parsed.orgId;
        const lid = parsed.locationId ?? parsed.location_id ?? null;
        if (typeof lid === 'string' && lid.trim()) locationIdFromState = lid.trim();
      } catch {
        /* ignore */
      }
    };
    const base64Standard = stateRaw.replace(/-/g, '+').replace(/_/g, '/');
    try {
      tryParse(Buffer.from(base64Standard, 'base64').toString('utf-8'));
    } catch {
      try {
        tryParse(stateRaw);
      } catch {
        try {
          const state = new URLSearchParams(stateRaw);
          const r = state.get('redirect');
          if (r) redirectTo = r;
          const o = state.get('orgId');
          if (o) orgId = o;
          const lid = state.get('locationId') ?? state.get('location_id');
          if (lid && lid.trim()) locationIdFromState = lid.trim();
        } catch {
          /* ignore */
        }
      }
    }
  }
  const locationIdFromQuery = (() => {
    const q = searchParams.get('locationId') ?? searchParams.get('location_id') ?? searchParams.get('location') ?? null;
    return typeof q === 'string' && q.trim() ? q.trim() : null;
  })();
  const PENDING_COOKIE = 'ghl_pending_location_id';
  const locationIdFromCookie = request.cookies.get(PENDING_COOKIE)?.value?.trim() || null;
  if (error) {
    const msg = searchParams.get('error_description') || error;
    console.error(LOG, 'OAuth error from GHL', { error, description: msg });
    return new NextResponse(htmlError('OAuth error', String(msg), error), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (!code) {
    console.warn(LOG, 'No code — direct visit or missing params');
    return new NextResponse(htmlError('Missing code', 'This URL is the OAuth callback. GHL redirects here with ?code=...&state=... after the user authorizes. Open it from the install flow, not directly.', 'missing_code'), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(LOG, 'Missing GHL_CLIENT_ID or GHL_CLIENT_SECRET');
    return new NextResponse(htmlError('Server config', 'OAuth not configured. Set GHL_CLIENT_ID and GHL_CLIENT_SECRET.', 'server_config'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const redirectUri = getRedirectUri();
  if (!redirectUri || !redirectUri.includes('/api/auth/')) {
    console.error(LOG, 'GHL_REDIRECT_URI not set or invalid');
    return new NextResponse(htmlError('Server config', 'GHL_REDIRECT_URI must be the callback URL (https://www.cleanquote.io/api/auth/connect/callback).', 'server_config'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = String(data.message ?? data.error ?? 'Token exchange failed');
      console.error(LOG, 'Token exchange failed', res.status, errMsg);
      return new NextResponse(htmlError('Token exchange failed', errMsg, 'token_exchange'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const tokenKeys = Object.keys(data);
    const userType = (data as Record<string, unknown>).userType ?? (data as Record<string, unknown>).user_type ?? null;
    console.log(LOG, 'Token exchanged', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      tokenResponseKeys: tokenKeys.join(', '),
      userType,
      locationIdInBody: !!(data.locationId ?? data.location_id ?? data.location?.id ?? data.resource_id),
    });

    const companyId = data.companyId ?? data.company_id ?? '';
    const userId = data.userId ?? data.user_id ?? '';

    // State (iframe) first, then query, then cookie (when state lost e.g. Back + marketplace install), then token, JWT, API.
    let locationId: string | null = null;
    let locationSource: 'state' | 'query' | 'cookie' | 'token' | 'jwt' | 'api' = 'token';
    let usedPendingCookie = false;
    if (locationIdFromState) {
      locationId = locationIdFromState;
      locationSource = 'state';
    }
    if (!locationId && locationIdFromQuery) {
      locationId = locationIdFromQuery;
      locationSource = 'query';
    }
    if (!locationId && locationIdFromCookie) {
      locationId = locationIdFromCookie;
      locationSource = 'cookie';
      usedPendingCookie = true;
    }
    if (!locationId) {
      locationId =
        data.locationId ??
        data.location_id ??
        data.location?.id ??
        data.resource_id ??
        null;
      if (locationId) locationSource = 'token';
    }
    if (!locationId && data.access_token) {
      const jwtLocationId = getLocationIdFromJwt(data.access_token);
      if (jwtLocationId) {
        locationId = jwtLocationId;
        locationSource = 'jwt';
      }
    }
    if (!locationId && data.access_token) {
      locationId = await fetchLocationFromToken(data.access_token, companyId);
      locationSource = 'api';
    }

    if (!locationId) {
      console.error(LOG, 'No locationId', { tokenKeys: tokenKeys.join(', ') });
      return new NextResponse(htmlError('No location', 'Installation did not return a location ID. Token keys: ' + tokenKeys.join(', '), 'no_location'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    locationId = locationId.trim();

    const expiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;

    const companyName = await fetchLocationName(data.access_token, locationId);

    const userTypeVal = String(userType ?? '').toLowerCase();
    const installationPayload = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
      expiresAt,
      companyId,
      userId,
      locationId,
      companyName: companyName ?? undefined,
      userType: userTypeVal === 'company' ? 'Company' : userTypeVal === 'location' ? 'Location' : undefined,
    };

    try {
      console.log(LOG, 'Storing in KV', { locationId: locationId.slice(0, 8) + '..', hasAccess: !!data.access_token, hasRefresh: !!data.refresh_token });
      await storeInstallation(installationPayload);
      // When a Company (Agency) user installs, that token has oauth.write — store it for POST /oauth/locationToken.
      if (String(userType).toLowerCase() === 'company') {
        await storeAgencyTokenFromInstall({
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? '',
          expiresAt,
          companyId,
        });
      }
    } catch (storeErr) {
      const storeMsg = storeErr instanceof Error ? storeErr.message : String(storeErr);
      console.error(LOG, 'KV store failed', storeErr);
      return new NextResponse(
        htmlError(
          'Storage failed',
          'Tokens could not be saved. ' +
            (storeMsg.includes('KV_REST_API') || storeMsg.includes('required')
              ? 'Set KV_REST_API_URL and KV_REST_API_TOKEN (Vercel KV) in your project environment.'
              : storeMsg),
          'storage_failed'
        ),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    const readBack = await getInstallation(locationId);
    if (!readBack?.accessToken) {
      console.error(LOG, 'KV verify failed: read-back missing token', { locationId: locationId.slice(0, 8) + '..' });
      return new NextResponse(
        htmlError(
          'Storage verification failed',
          'Tokens were written but could not be read back. Ensure KV (Vercel KV: KV_REST_API_URL, KV_REST_API_TOKEN) is configured and the same store is used by all routes.',
          'storage_verify_failed'
        ),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }
    console.log(LOG, 'KV stored and verified OK', { locationId: locationId.slice(0, 8) + '..' });

    if (orgId) {
      await setOrgGHLOAuth(orgId, locationId);
    }

    const sessionToken = await createSessionToken({ locationId, companyId, userId });
    const stateDebug =
      locationSource === 'state'
        ? 'Location from state (iframe where you clicked Connect).'
        : locationSource === 'query'
          ? 'Location from callback URL query (GHL passed it).'
          : locationSource === 'cookie'
            ? 'Location from pending cookie (state was lost; you started Connect from this location).'
            : locationSource === 'token'
              ? 'Location from GHL token response (installed location).'
              : locationSource === 'jwt'
                ? 'Location from JWT payload (token body had no locationId).'
                : 'Location from /locations/ API fallback.';
    const html = htmlSuccess(
      locationId,
      (data.access_token ?? '').length,
      (data.refresh_token ?? '').length,
      companyName ?? undefined,
      locationSource,
      stateDebug,
      {
        tokenResponseKeys: tokenKeys.join(', '),
        userType: String(userType ?? ''),
        locationIdInBody: !!(data.locationId ?? data.location_id ?? data.location?.id ?? data.resource_id),
        stateHadLocationId: !!locationIdFromState,
        locationIdFromStatePreview: locationIdFromState ? locationIdFromState.slice(0, 8) + '..' + locationIdFromState.slice(-4) : '',
        locationSource,
      }
    );
    const response = new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

    const cookieOptions: { httpOnly: boolean; secure: boolean; sameSite: 'lax' | 'none'; maxAge: number; path: string; domain?: string } = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    };
    try {
      const callbackHost = request.headers.get('host')?.split(':')[0] ?? '';
      if (callbackHost && callbackHost !== 'localhost' && !callbackHost.startsWith('127.')) {
        const parts = callbackHost.split('.');
        if (parts.length >= 2) {
          const rootDomain = parts.length >= 3 ? parts.slice(-2).join('.') : callbackHost;
          cookieOptions.domain = rootDomain;
        }
      }
    } catch {
      /* ignore */
    }
    response.cookies.set('ghl_session', sessionToken, cookieOptions);
    if (usedPendingCookie) {
      response.cookies.set(PENDING_COOKIE, '', { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0, path: '/' });
    }
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(LOG, 'Callback exception', err);
    return new NextResponse(htmlError('Callback error', msg, 'callback_error'), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
