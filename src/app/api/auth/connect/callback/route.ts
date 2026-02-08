/**
 * OAuth callback for marketplace app install.
 * CALLBACK URL: https://www.cleanquote.io/api/auth/connect/callback
 * GHL redirects here with ?code=...&state=... . We exchange for tokens, store in KV, then
 * return an HTML success page on THIS URL (no redirect) with proof: locationId + token stored.
 */

import { NextRequest, NextResponse } from 'next/server';
import { storeInstallation } from '@/lib/ghl/token-store';
import { createSessionToken } from '@/lib/ghl/session';
import { setOrgGHLOAuth } from '@/lib/config/store';
import { getRedirectUri, getPostOAuthRedirectBase } from '@/lib/ghl/oauth-utils';
import { fetchLocationName } from '@/lib/ghl/location-info';

const LOG = '[CQ Connect Callback]';

function htmlSuccess(locationId: string, accessTokenLength: number, refreshTokenLength: number, companyName?: string, source?: string) {
  const safeLocationId = locationId.replace(/[<>"']/g, '');
  const safeCompany = (companyName ?? '').replace(/[<>"']/g, '');
  const sourceNote = source ? ` <span class="source">(${source})</span>` : '';
  const multiLocationWarning = source === 'token_or_api' ? '<p class="row warn">You have multiple locations. This was stored under the location returned by GHL. To connect a specific location, open that location in GHL and use Connect from the app there.</p>' : '';
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
</style>
</head>
<body>
  <div class="card">
    <h1>Callback URL worked</h1>
    <p>This is the OAuth callback. Tokens were exchanged and stored in KV.</p>
    <div class="row"><span class="label">Location ID:</span> <span class="value">${safeLocationId}</span>${sourceNote}</div>
    <div class="row"><span class="label">Token in KV:</span> <span class="ok">stored</span> (access length: ${accessTokenLength}, refresh length: ${refreshTokenLength})</div>
    ${safeCompany ? `<div class="row"><span class="label">Company:</span> ${safeCompany}</div>` : ''}
    ${multiLocationWarning}
  </div>
  <script>
    (function(){
      var loc = ${JSON.stringify(safeLocationId)};
      var al = ${accessTokenLength};
      var rl = ${refreshTokenLength};
      console.log('[CQ OAuth Callback] Success — callback URL handled. locationId:', loc);
      console.log('[CQ OAuth Callback] Token stored in KV. accessToken length:', al, 'refreshToken length:', rl);
    })();
  </script>
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
  <script>
    console.error('[CQ OAuth Callback] Error:', ${JSON.stringify(safeMsg)});
  </script>
</body>
</html>`;
}

const TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';
const API_BASE = 'https://services.leadconnectorhq.com';

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

  console.log(LOG, 'CALLBACK HIT', { hasCode: !!code, hasState: !!stateRaw, hasError: !!error, paramKeys: Array.from(searchParams.keys()) });

  const locationIdFromQuery =
    searchParams.get('locationId') ??
    searchParams.get('location_id') ??
    searchParams.get('location') ??
    null;

  let locationIdFromState: string | null = null;
  let redirectTo = '/dashboard';
  let orgId: string | null = null;
  console.log(LOG, 'State param', { stateLength: stateRaw?.length ?? 0, statePreview: stateRaw ? stateRaw.slice(0, 60) + (stateRaw.length > 60 ? '...' : '') : null });
  if (stateRaw) {
    const tryParse = (decoded: string): string | null => {
      try {
        const parsed = JSON.parse(decoded);
        const id = parsed.locationId ?? parsed.location_id ?? null;
        if (id) locationIdFromState = id;
        if (parsed.redirect) redirectTo = parsed.redirect;
        if (parsed.orgId) orgId = parsed.orgId;
        return typeof id === 'string' ? id : null;
      } catch {
        return null;
      }
    };
    // Authorize sends state as base64(JSON). GHL may return base64url — try both so we get iframe location for multi-location users
    const base64Standard = stateRaw.replace(/-/g, '+').replace(/_/g, '/');
    try {
      const decoded = Buffer.from(base64Standard, 'base64').toString('utf-8');
      const parsedId = tryParse(decoded);
      if (parsedId) {
        console.log(LOG, 'State parsed (base64/base64url+JSON)', { locationIdPreview: parsedId.slice(0, 8) + '..' + parsedId.slice(-4) });
      }
    } catch {
      /* ignore */
    }
    if (!locationIdFromState) {
      try {
        if (tryParse(stateRaw) != null) console.log(LOG, 'State parsed (raw JSON)');
      } catch {
        try {
          const state = new URLSearchParams(stateRaw);
          locationIdFromState = state.get('locationId') ?? state.get('location_id') ?? null;
          const r = state.get('redirect');
          if (r) redirectTo = r;
          orgId = state.get('orgId');
        } catch {
          /* ignore */
        }
      }
    }
  }

  let locationId = locationIdFromState ?? locationIdFromQuery ?? null;
  if (locationIdFromState && locationIdFromQuery && locationIdFromState !== locationIdFromQuery) {
    console.log(LOG, 'Using locationId from state (iframe) over query', { state: locationIdFromState.slice(0, 8) + '..', query: locationIdFromQuery.slice(0, 8) + '..' });
  }

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

    console.log(LOG, 'Token exchanged', { hasAccessToken: !!data.access_token, hasRefreshToken: !!data.refresh_token });

    const companyId = data.companyId ?? data.company_id ?? '';
    const userId = data.userId ?? data.user_id ?? '';

    if (!locationId) {
      locationId =
        data.locationId ??
        data.location_id ??
        data.location?.id ??
        data.resource_id ??
        null;
    }

    if (!locationId && data.access_token) {
      locationId = await fetchLocationFromToken(data.access_token, companyId);
    }

    if (!locationId) {
      console.error(LOG, 'No locationId', { tokenKeys: Object.keys(data).join(', ') });
      return new NextResponse(htmlError('No location', 'Installation did not return a location ID. Token keys: ' + Object.keys(data).join(', '), 'no_location'), {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    locationId = locationId.trim();
    const source = locationIdFromState ? 'state (iframe — this location)' : locationIdFromQuery ? 'query' : 'token_or_api';
    if (source === 'token_or_api') {
      console.warn(LOG, 'Using locationId from token/API — user may have multiple locations; iframe location was not in state. Always use Connect from the specific location dashboard.');
    }
    console.log(LOG, 'locationId resolved for KV storage', { locationId: locationId.slice(0, 8) + '..' + locationId.slice(-4), source });

    const expiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;

    const companyName = await fetchLocationName(data.access_token, locationId);

    console.log(LOG, 'Storing in KV', { locationId: locationId.slice(0, 8) + '..', hasAccess: !!data.access_token, hasRefresh: !!data.refresh_token });
    await storeInstallation({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
      expiresAt,
      companyId,
      userId,
      locationId,
      companyName: companyName ?? undefined,
    });
    console.log(LOG, 'Stored in KV OK');

    if (orgId) {
      await setOrgGHLOAuth(orgId, locationId);
    }

    const sessionToken = await createSessionToken({ locationId, companyId, userId });
    const html = htmlSuccess(
      locationId,
      (data.access_token ?? '').length,
      (data.refresh_token ?? '').length,
      companyName ?? undefined,
      source
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
      const postAuthBase = getPostOAuthRedirectBase();
      const redirectHost = new URL(postAuthBase).hostname;
      const callbackHost = request.headers.get('host')?.split(':')[0] ?? '';
      const parts = redirectHost.split('.');
      if (parts.length >= 3 && redirectHost !== 'localhost' && !redirectHost.startsWith('127.')) {
        const parentDomain = parts.slice(-2).join('.');
        if (callbackHost.endsWith(parentDomain) || callbackHost === parentDomain) {
          cookieOptions.domain = parentDomain;
        }
      }
      if (!cookieOptions.domain && callbackHost && callbackHost !== 'localhost' && !callbackHost.startsWith('127.')) {
        cookieOptions.domain = callbackHost;
      }
    } catch {
      /* ignore */
    }
    response.cookies.set('ghl_session', sessionToken, cookieOptions);
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
