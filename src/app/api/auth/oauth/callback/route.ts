import { NextRequest, NextResponse } from 'next/server';
import { storeInstallation } from '@/lib/ghl/token-store';
import { createSessionToken } from '@/lib/ghl/session';
import { setOrgGHLOAuth } from '@/lib/config/store';
import { getAppBaseUrl, getRedirectUri } from '@/lib/ghl/oauth-utils';

export const dynamic = 'force-dynamic';

const APP_BASE = getAppBaseUrl();

// #region agent log
function debugLog(message: string, data: Record<string, unknown>) {
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: 'oauth/callback/route.ts', message, data, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

function parseState(state: string | null): { redirect: string; orgId?: string } {
  const fallback = { redirect: '/oauth-success' };
  if (!state) return fallback;
  try {
    const params = new URLSearchParams(state);
    const redirect = params.get('redirect');
    const orgId = params.get('orgId');
    if (redirect && redirect.startsWith('/')) return { redirect, orgId: orgId ?? undefined };
  } catch {
    /* not URLSearchParams */
  }
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const r = parsed?.redirect;
    return { redirect: typeof r === 'string' && r.startsWith('/') ? r : '/oauth-success', orgId: parsed?.orgId };
  } catch {
    try {
      const parsed = JSON.parse(state);
      const r = parsed?.redirect;
      return { redirect: typeof r === 'string' && r.startsWith('/') ? r : '/oauth-success', orgId: parsed?.orgId };
    } catch {
      return fallback;
    }
  }
}

/**
 * GET /api/auth/oauth/callback
 * Same flow as GHL marketplace template (Maid Central style): 1) get code 2) exchange for tokens
 * 3) store installation by resource id (locationId or companyId from response; we add state/query/API for iframe)
 * 4) redirect. We also set session cookie and redirect to state.redirect. See GHL_IFRAME_APP_AUTH.md.
 */
export async function GET(request: NextRequest) {
  try {
    const allParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    const callbackHost = request.headers.get('host') ?? 'unknown';
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const locationId = request.nextUrl.searchParams.get('locationId');
    const error = request.nextUrl.searchParams.get('error');
    console.log('[CQ Callback] STEP 1 — callback hit', { host: callbackHost, hasCode: !!code, hasState: !!state, hasError: !!error, paramKeys: Object.keys(allParams) });

    // #region agent log
    debugLog('OAuth callback hit', {
      hasCode: !!code,
      hasState: !!state,
      locationIdParam: locationId ?? null,
      error: error ?? null,
      paramKeys: Object.keys(allParams),
    });
    // #endregion

    if (error) {
      const errorDescription = request.nextUrl.searchParams.get('error_description') || 'No description provided';
      const errorUri = request.nextUrl.searchParams.get('error_uri');
      console.error('[CQ Callback] STEP 2 — GHL returned error', { error, errorDescription });
      console.error('[OAuth Callback] Error Code:', error);
      console.error('[OAuth Callback] Error Description:', errorDescription);
      console.error('[OAuth Callback] Error URI:', errorUri);
      console.error('[OAuth Callback] State:', state);
      console.error('[OAuth Callback] All Query Params:', JSON.stringify(allParams, null, 2));
      console.error('[OAuth Callback] Client ID configured:', !!process.env.GHL_CLIENT_ID);
      console.error('[OAuth Callback] Redirect URI:', getRedirectUri(APP_BASE));
      console.error('[OAuth Callback] APP_BASE_URL:', process.env.APP_BASE_URL || 'NOT SET');
      console.error('[OAuth Callback] ============================================');
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', error);
      errorUrl.searchParams.set('error_description', errorDescription);
      if (errorUri) errorUrl.searchParams.set('error_uri', errorUri);
      if (state) errorUrl.searchParams.set('state', state);
      return NextResponse.redirect(errorUrl.toString());
    }

    if (!code) {
      console.error('[CQ Callback] STEP 2 — no code from GHL', { paramKeys: Object.keys(allParams) });
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', `no_code: ${JSON.stringify(allParams)}`);
      return NextResponse.redirect(errorUrl.toString());
    }

    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    const redirectUri = getRedirectUri(APP_BASE);

    if (!clientId || !clientSecret) {
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', 'oauth_not_configured');
      return NextResponse.redirect(errorUrl.toString());
    }

    // Token exchange: same as GHL template (client_id, client_secret, grant_type, code) + redirect_uri per OAuth spec
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    console.log('[CQ Callback] STEP 3 — exchanging code for token');
    console.log('[OAuth Callback] Using form-urlencoded content type');
    console.log('[OAuth Callback] Token exchange request params:', {
      grant_type: tokenParams.get('grant_type'),
      code: tokenParams.get('code') ? `${tokenParams.get('code')?.substring(0, 20)}...` : 'MISSING',
      client_id: tokenParams.get('client_id') ? `${clientId.substring(0, 10)}...` : 'MISSING',
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    console.log('[CQ Callback] STEP 4 — token response', { status: tokenResponse.status, ok: tokenResponse.ok });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      let errorData: { error?: string; error_description?: string; message?: string; raw?: string };
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: 'Unknown error', raw: errorText };
      }
      console.error('[OAuth Callback] Token exchange error - Response body:', errorText);
      console.error('[OAuth Callback] Token exchange error parsed:', errorData);
      debugLog('OAuth callback token exchange failed', { status: tokenResponse.status, error: errorData?.error });
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', errorData.error || 'token_exchange_failed');
      errorUrl.searchParams.set('error_description', errorData.error_description || errorData.message || '');
      return NextResponse.redirect(errorUrl.toString());
    }

    const tokenData = await tokenResponse.json();
    console.log('[CQ Callback] STEP 5 — token received', {
      hasAccessToken: !!tokenData.access_token,
      hasLocationId: !!(tokenData.locationId || tokenData.location_id),
      keys: Object.keys(tokenData),
    });

    // Validate token format (JWT)
    if (tokenData.access_token) {
      const tokenParts = tokenData.access_token.split('.');
      if (tokenParts.length !== 3) {
        console.error('[CQ Callback] STEP 5b — token not JWT', { parts: tokenParts.length });
        const errorUrl = new URL('/oauth-success', APP_BASE);
        errorUrl.searchParams.set('error', `invalid_token_format: Token from GHL is not a valid JWT (${tokenParts.length} parts, expected 3)`);
        return NextResponse.redirect(errorUrl.toString());
      }
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[CQ Callback] STEP 5c — no access_token in response');
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', 'no_access_token: GHL did not return an access token');
      return NextResponse.redirect(errorUrl.toString());
    }

    // Resource id for storage — same as GHL template: prefer token response (locationId then companyId), then state/query for iframe, then /locations/ API
    let locationIdFromState: string | null = null;
    if (state) {
      try {
        const decoded = Buffer.from(state, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        locationIdFromState = parsed.locationId || parsed.location_id || null;
      } catch {
        try {
          locationIdFromState = JSON.parse(state).locationId || null;
        } catch {
          locationIdFromState = state.length > 20 ? null : state;
        }
      }
    }
    const locationIdFromToken = tokenData.locationId || tokenData.location_id || tokenData.location?.id;
    let finalLocationId: string | null =
      locationIdFromToken ||
      locationIdFromState ||
      locationId ||
      null;

    // If still no locationId, fetch from GHL /locations/ API
    if (!finalLocationId) {
      console.log('[OAuth Callback] No locationId in response, fetching from GHL API...');
      try {
        const locationsResponse = await fetch('https://services.leadconnectorhq.com/locations/', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Version: '2021-04-15',
            'Content-Type': 'application/json',
          },
        });
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          if (locationsData.locations && Array.isArray(locationsData.locations) && locationsData.locations.length > 0) {
            finalLocationId = locationsData.locations[0].id || locationsData.locations[0].locationId;
            console.log('[OAuth Callback] Found locationId from locations API:', finalLocationId);
          } else if (locationsData.location && locationsData.location.id) {
            finalLocationId = locationsData.location.id;
            console.log('[OAuth Callback] Found locationId from location object:', finalLocationId);
          } else if (locationsData.id) {
            finalLocationId = locationsData.id;
            console.log('[OAuth Callback] Found locationId from direct response:', finalLocationId);
          } else if (Array.isArray(locationsData) && locationsData.length > 0) {
            finalLocationId = locationsData[0].id || locationsData[0].locationId;
            console.log('[OAuth Callback] Found locationId from array response:', finalLocationId);
          }
        } else {
          const errText = await locationsResponse.text();
          console.error('[OAuth Callback] Failed to fetch locations:', locationsResponse.status, errText);
        }
      } catch (apiError) {
        console.error('[OAuth Callback] Error fetching locations from API:', apiError);
      }
    }

    if (!finalLocationId) {
      console.error('[CQ Callback] STEP 6 — no locationId', { locationIdFromState: !!locationIdFromState, queryLocationId: !!locationId, tokenKeys: Object.keys(tokenData) });
      debugLog('OAuth callback no locationId', { locationId, tokenKeys: Object.keys(tokenData) });
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', 'no_location_id: Unable to determine location ID from OAuth response or API call');
      return NextResponse.redirect(errorUrl.toString());
    }

    console.log('[CQ Callback] STEP 6 — locationId resolved', { finalLocationId: finalLocationId?.slice(0, 12) + '...' });

    const expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : Date.now() + 86400 * 1000;

    console.log('[CQ Callback] STEP 7 — storing to KV', { locationId: finalLocationId?.slice(0, 12) + '...' });
    try {
      await storeInstallation({
        locationId: finalLocationId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? '',
        expiresAt,
        companyId: tokenData.companyId ?? tokenData.company_id ?? '',
        userId: tokenData.userId ?? tokenData.user_id ?? '',
      });
    } catch (storeErr) {
      console.error('[OAuth Callback] ❌ STORAGE FAILED — tokens were NOT saved. Check KV (Vercel KV or KV_REST_API_* env vars).', storeErr);
      debugLog('OAuth callback storeInstallation failed', { error: storeErr instanceof Error ? storeErr.message : String(storeErr) });
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', 'storage_failed');
      errorUrl.searchParams.set('error_description', storeErr instanceof Error ? storeErr.message : 'Failed to save OAuth tokens. Check server logs and KV configuration.');
      return NextResponse.redirect(errorUrl.toString());
    }

    const { redirect: redirectTo, orgId } = parseState(state);
    console.log('[CQ Callback] STEP 7b — parseState', { redirectTo, hasOrgId: !!orgId });
    const companyId = tokenData.companyId ?? tokenData.company_id ?? '';
    const userId = tokenData.userId ?? tokenData.user_id ?? '';

    const sessionToken = await createSessionToken({ locationId: finalLocationId, companyId, userId });

    let targetUrl: string;
    if (redirectTo === '/oauth-success') {
      const u = new URL('/oauth-success', APP_BASE);
      u.searchParams.set('success', 'oauth_installed');
      u.searchParams.set('locationId', finalLocationId);
      targetUrl = u.toString();
    } else {
      const u = new URL(redirectTo, APP_BASE);
      u.searchParams.set('locationId', finalLocationId);
      targetUrl = u.toString();
    }

    if (orgId) await setOrgGHLOAuth(orgId, finalLocationId);

    console.log('[CQ Callback] STEP 8 — SUCCESS', { targetUrl, locationId: finalLocationId?.slice(0, 12) + '...' });

    debugLog('OAuth callback success redirect', { targetUrl, cookieSet: true });
    const res = NextResponse.redirect(targetUrl);
    const cookieOptions: { httpOnly: boolean; secure: boolean; sameSite: 'none'; maxAge: number; path: string; domain?: string } = {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    };
    try {
      const baseHost = new URL(APP_BASE).hostname;
      if (baseHost && baseHost !== 'localhost' && !baseHost.startsWith('127.')) {
        cookieOptions.domain = baseHost;
      }
    } catch {
      /* ignore */
    }
    res.cookies.set('ghl_session', sessionToken, cookieOptions);
    console.log('[CQ Callback] STEP 9 — cookie set', { domain: (cookieOptions as { domain?: string }).domain ?? '(default)', path: '/' });
    return res;
  } catch (error) {
    console.error('[OAuth Callback] Error in OAuth callback:', error);
    debugLog('OAuth callback exception', { error: error instanceof Error ? error.message : String(error) });
    const errorUrl = new URL('/oauth-success', APP_BASE);
    const msg = error instanceof Error ? error.message : 'oauth_callback_failed';
    errorUrl.searchParams.set('error', msg.includes('KV') || msg.includes('store') ? 'storage_failed' : 'oauth_callback_failed');
    errorUrl.searchParams.set('error_description', msg);
    return NextResponse.redirect(errorUrl.toString());
  }
}
