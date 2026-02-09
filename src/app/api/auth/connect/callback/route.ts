/**
 * OAuth callback for marketplace app install.
 * CALLBACK URL: https://www.cleanquote.io/api/auth/connect/callback
 * GHL redirects here with ?code=...&state=... . We exchange for tokens, store in KV, then
 * return an HTML success page on THIS URL (no redirect) with proof: locationId + token stored.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getInstallation,
  normalizeLocationId,
  storeLocationOAuthAndToken,
  fetchLocationTokenFromOAuth,
  type GHLOAuthResponse,
  type GHLLocationTokenResponse,
} from '@/lib/ghl/token-store';
import { getAndConsumeInstallSession } from '@/lib/ghl/install-session';
import { createSessionToken } from '@/lib/ghl/session';
import { setOrgGHLOAuth } from '@/lib/config/store';
import { getRedirectUri, getPostOAuthRedirectBase } from '@/lib/ghl/oauth-utils';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state')?.trim() ?? null;

  let redirectTo = '/dashboard';
  let orgId: string | null = null;

  const PENDING_LOCATION = 'ghl_pending_location_id';
  const PENDING_COMPANY = 'ghl_pending_company_id';
  const locationIdFromCookie = request.cookies.get(PENDING_LOCATION)?.value?.trim() || null;
  const companyIdFromCookie = request.cookies.get(PENDING_COMPANY)?.value?.trim() || null;

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

  // Resolve locationId (and companyId) by state → KV install_sessions first, then cookies. Abort if unresolved.
  let resolvedLocationId: string | null = null;
  let resolvedCompanyId: string | null = null;
  let locationSource: 'kv_session' | 'cookie' | 'token' | 'query' | 'jwt' | 'api' = 'cookie';

  if (stateRaw) {
    const session = await getAndConsumeInstallSession(stateRaw);
    if (session?.location_id) {
      resolvedLocationId = session.location_id.trim();
      resolvedCompanyId = session.company_id ?? null;
      locationSource = 'kv_session';
    }
  }
  if (!resolvedLocationId && locationIdFromCookie) {
    resolvedLocationId = locationIdFromCookie;
    resolvedCompanyId = companyIdFromCookie;
    locationSource = 'cookie';
  }

  if (!resolvedLocationId) {
    console.error(LOG, 'No locationId: state session missing or expired and no cookie. Require re-connect from iframe.');
    return new NextResponse(
      htmlError(
        'Location not resolved',
        'We could not determine which location this install is for. Please open the app from the location in GHL and click Connect again (state session may have expired).',
        'no_location'
      ),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
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

    const companyIdFromToken = String(data.companyId ?? data.company_id ?? '').trim();
    const userId = data.userId ?? data.user_id ?? '';

    // Use resolved location/company from state→KV or cookies (already validated before code exchange).
    const companyId = resolvedCompanyId ?? (companyIdFromToken || null);
    const locationId = normalizeLocationId(resolvedLocationId);

    const oauthResponse = data as GHLOAuthResponse;

    // POST /oauth/locationToken with Location OAuth Access Token (callback access_token) to get Location Access Token.
    const locationTokenResult = await fetchLocationTokenFromOAuth(
      locationId,
      companyId || (process.env.GHL_COMPANY_ID ?? '').trim(),
      (data.access_token as string) ?? ''
    );

    if (!locationTokenResult.success || !locationTokenResult.data) {
      console.error(LOG, 'POST /oauth/locationToken failed', { error: locationTokenResult.error, locationId: locationId.slice(0, 12) + '..' });
      return new NextResponse(
        htmlError(
          'Location token failed',
          'We stored the OAuth response but could not get the Location Access Token. ' +
            (locationTokenResult.error ?? 'Missing companyId? Set GHL_COMPANY_ID or ensure the OAuth response includes company_id.'),
          'location_token_failed'
        ),
        { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      );
    }

    try {
      const kvKey = `ghl:install:${locationId}`;
      console.log(LOG, 'Storing in KV', { kvKey, locationId, locationIdSource: locationSource });
      await storeLocationOAuthAndToken(locationId, oauthResponse, locationTokenResult.data);
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

    const sessionToken = await createSessionToken({ locationId, companyId: companyId ?? '', userId });
    const stateDebug =
      locationSource === 'kv_session'
        ? 'Location from install session (state→KV).'
        : 'Location from pending cookie (session expired or state lost).';
    const html = htmlSuccess(
      locationId,
      (locationTokenResult.data?.access_token ?? '').length,
      (locationTokenResult.data?.refresh_token ?? '').length,
      undefined,
      locationSource,
      stateDebug,
      {
        tokenResponseKeys: tokenKeys.join(', '),
        userType: String(userType ?? ''),
        locationIdInBody: !!(data.locationId ?? data.location_id ?? (data as { location?: { id?: string } }).location?.id ?? data.resource_id),
        stateHadLocationId: locationSource === 'kv_session',
        locationIdFromStatePreview: locationSource === 'kv_session' ? locationId.slice(0, 8) + '..' + locationId.slice(-4) : '',
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
    const clearOpts = { httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 0, path: '/' };
    response.cookies.set(PENDING_LOCATION, '', clearOpts);
    response.cookies.set(PENDING_COMPANY, '', clearOpts);
    response.cookies.set('ghl_pending_oauth_state', '', clearOpts);
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
