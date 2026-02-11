import { NextRequest, NextResponse } from 'next/server';
import { storeInstallation, getInstallation, storeAgencyTokenFromInstall, normalizeLocationId } from '@/lib/ghl/token-store';
import { createSessionToken } from '@/lib/ghl/session';
import { setOrgGHLOAuth } from '@/lib/config/store';
import { getAppBaseUrl, getRedirectUri, getPostOAuthRedirectBase, getPostOAuthRedirectPath } from '@/lib/ghl/oauth-utils';

export const dynamic = 'force-dynamic';

const APP_BASE = getAppBaseUrl();


function parseState(state: string | null): { redirect: string; orgId?: string } {
  const fallback = { redirect: '/dashboard' };
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
    return { redirect: typeof r === 'string' && r.startsWith('/') ? r : '/dashboard', orgId: parsed?.orgId };
  } catch {
    try {
      const parsed = JSON.parse(state);
      const r = parsed?.redirect;
      return { redirect: typeof r === 'string' && r.startsWith('/') ? r : '/dashboard', orgId: parsed?.orgId };
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

    console.log('[CQ Callback] ========== CALLBACK INVOKED ==========');
    console.log('[CQ Callback] STEP 1 — request', {
      host: callbackHost,
      pathname: request.nextUrl.pathname,
      hasCode: !!code,
      codeLength: code?.length ?? 0,
      hasState: !!state,
      stateLength: state?.length ?? 0,
      locationIdParam: locationId ?? null,
      hasError: !!error,
      paramKeys: Object.keys(allParams),
    });
    console.log('[CQ Callback] STEP 1 — query params (no secrets)', {
      ...Object.fromEntries(
        Object.entries(allParams).map(([k, v]) => [k, k === 'code' ? (v ? `${v.slice(0, 8)}...` : null) : v])
      ),
    });

    const callbackReferer = request.headers.get('referer') ?? '';

    if (error) {
      const errorDescription = request.nextUrl.searchParams.get('error_description') || 'No description provided';
      const errorUri = request.nextUrl.searchParams.get('error_uri');
      console.log('[CQ Callback] STEP 2 — GHL error branch');
      console.error('[CQ Callback] STEP 2 — GHL returned error', { error, errorDescription, errorUri, state: state ?? null });
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
      console.log('[CQ Callback] STEP 2 — no-code branch (redirecting to oauth-success with error)');
      console.error('[CQ Callback] STEP 2 — no code from GHL', { paramKeys: Object.keys(allParams), allParams });
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', `no_code: ${JSON.stringify(allParams)}`);
      return NextResponse.redirect(errorUrl.toString());
    }

    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    const redirectUri = getRedirectUri(APP_BASE);

    console.log('[CQ Callback] STEP 2b — env check', { hasClientId: !!clientId, hasClientSecret: !!clientSecret, redirectUri, APP_BASE });

    if (!clientId || !clientSecret) {
      console.log('[CQ Callback] STEP 2b — oauth_not_configured branch');
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
    console.log('[CQ Callback] STEP 3 — token request', {
      grant_type: tokenParams.get('grant_type'),
      codePreview: code ? `${code.slice(0, 12)}...` : 'MISSING',
      client_idPreview: clientId ? `${clientId.slice(0, 12)}...` : 'MISSING',
      redirect_uri: redirectUri,
      url: 'https://services.leadconnectorhq.com/oauth/token',
    });

    const tokenResponse = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    console.log('[CQ Callback] STEP 4 — token response', {
      status: tokenResponse.status,
      ok: tokenResponse.ok,
      statusText: tokenResponse.statusText,
      headersContentType: tokenResponse.headers.get('content-type'),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.log('[CQ Callback] STEP 4 — token exchange FAILED, body length:', errorText?.length ?? 0);
      let errorData: { error?: string; error_description?: string; message?: string; raw?: string };
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: 'Unknown error', raw: errorText };
      }
      console.error('[OAuth Callback] Token exchange error - Response body:', errorText);
      console.error('[OAuth Callback] Token exchange error parsed:', errorData);
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', errorData.error || 'token_exchange_failed');
      errorUrl.searchParams.set('error_description', errorData.error_description || errorData.message || '');
      return NextResponse.redirect(errorUrl.toString());
    }

    const tokenData = await tokenResponse.json();
    console.log('[CQ Callback] STEP 5 — token received', {
      keys: Object.keys(tokenData),
      hasAccessToken: !!tokenData.access_token,
      accessTokenLength: tokenData.access_token?.length ?? 0,
      hasRefreshToken: !!tokenData.refresh_token,
      hasLocationId: !!(tokenData.locationId || tokenData.location_id),
      locationIdFromToken: tokenData.locationId ?? tokenData.location_id ?? null,
      expires_in: tokenData.expires_in ?? null,
      companyId: tokenData.companyId ?? tokenData.company_id ?? null,
      userId: tokenData.userId ?? tokenData.user_id ?? null,
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

    // Resource id for storage — same as GHL template / Maid Central: token response first (locationId from installed app), then state/query, then /locations/ API
    let locationIdFromState: string | null = null;
    if (state) {
      try {
        const decoded = Buffer.from(state, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        locationIdFromState = parsed.locationId || parsed.location_id || null;
        console.log('[CQ Callback] STEP 5d — state parsed (base64+JSON)', { locationIdFromState, redirect: parsed?.redirect });
      } catch {
        try {
          locationIdFromState = JSON.parse(state).locationId || null;
          console.log('[CQ Callback] STEP 5d — state parsed (JSON only)', { locationIdFromState });
        } catch {
          locationIdFromState = state.length > 20 ? null : state;
          console.log('[CQ Callback] STEP 5d — state fallback (raw or null)', { locationIdFromState });
        }
      }
    } else {
      console.log('[CQ Callback] STEP 5d — no state param');
    }
    const locationIdFromToken = tokenData.locationId || tokenData.location_id || tokenData.location?.id;
    // Same as GHL template / Maid Central: use only locationId from token response (the app that was installed). Then state/query, then /locations/ API.
    let finalLocationId: string | null =
      locationIdFromToken ||
      locationIdFromState ||
      locationId ||
      null;

    console.log('[CQ Callback] STEP 5e — locationId (token first, like template)', {
      locationIdFromToken: locationIdFromToken ?? null,
      locationIdFromState: locationIdFromState ?? null,
      locationIdFromQuery: locationId ?? null,
      finalLocationId: finalLocationId ?? null,
    });

    // If still no locationId, fetch from GHL /locations/ API
    if (!finalLocationId) {
      console.log('[CQ Callback] STEP 5f — no locationId yet, calling GHL /locations/ API');
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
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', 'no_location_id: Unable to determine location ID from OAuth response or API call');
      return NextResponse.redirect(errorUrl.toString());
    }

    finalLocationId = normalizeLocationId(finalLocationId);
    console.log('[CQ Callback] STEP 6 — locationId resolved', { finalLocationId: finalLocationId?.slice(0, 12) + '...' });

    const expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : Date.now() + 86400 * 1000;
    const userTypeRaw = (tokenData as Record<string, unknown>).userType ?? (tokenData as Record<string, unknown>).user_type;
    const installUserType =
      String(userTypeRaw ?? '').toLowerCase() === 'company'
        ? 'Company'
        : String(userTypeRaw ?? '').toLowerCase() === 'location'
          ? 'Location'
          : undefined;

    console.log('[CQ Callback] STEP 7 — storing to KV', {
      kvKey: `ghl:install:${finalLocationId}`,
      locationId: finalLocationId?.slice(0, 12) + '...',
      userType: installUserType,
    });
    try {
      await storeInstallation({
        locationId: finalLocationId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? '',
        expiresAt,
        userType: installUserType,
      });
      const companyId = tokenData.companyId ?? tokenData.company_id ?? '';
      if (installUserType === 'Company' && companyId) {
        await storeAgencyTokenFromInstall({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token ?? '',
          expiresAt,
          companyId,
        });
      }
      console.log('[CQ Callback] STEP 7 — storeInstallation() returned (no throw)');
    } catch (storeErr) {
      console.error('[OAuth Callback] ❌ STORAGE FAILED — tokens were NOT saved. Check KV (Vercel KV or KV_REST_API_* env vars).', storeErr);
      const errorUrl = new URL('/oauth-success', APP_BASE);
      errorUrl.searchParams.set('error', 'storage_failed');
      errorUrl.searchParams.set('error_description', storeErr instanceof Error ? storeErr.message : 'Failed to save OAuth tokens. Check server logs and KV configuration.');
      return NextResponse.redirect(errorUrl.toString());
    }

    // Verify tokens are readable from KV for future lookup (session, getTokenForLocation, etc.)
    try {
      const readBack = await getInstallation(finalLocationId);
      if (readBack?.accessToken && readBack?.refreshToken) {
        console.log('[CQ Callback] STEP 7a — KV verify OK: tokens readable for future lookup', { locationId: finalLocationId.slice(0, 12) + '...' });
      } else {
        console.warn('[CQ Callback] STEP 7a — KV read-back missing tokens', { hasInstall: !!readBack });
      }
    } catch (verifyErr) {
      console.warn('[CQ Callback] STEP 7a — KV verify read-back failed (tokens were written)', verifyErr);
    }

    const { redirect: redirectTo, orgId } = parseState(state);
    console.log('[CQ Callback] STEP 7b — parseState', { rawStateLength: state?.length ?? 0, redirectTo, orgId: orgId ?? null });
    const companyId = tokenData.companyId ?? tokenData.company_id ?? '';
    const userId = tokenData.userId ?? tokenData.user_id ?? '';

    const sessionToken = await createSessionToken({ locationId: finalLocationId, companyId, userId });
    console.log('[CQ Callback] STEP 7c — session token created', { sessionTokenLength: sessionToken?.length ?? 0 });

    // Always send user to canonical app URL (e.g. www.cleanquote.io/v2/location/LOCATIONID/dashboard)
    const postAuthBase = getPostOAuthRedirectBase();
    const path = getPostOAuthRedirectPath(redirectTo, finalLocationId);
    const u = new URL(path, postAuthBase);
    if (path === '/oauth-success') {
      u.searchParams.set('locationId', finalLocationId);
      u.searchParams.set('success', 'oauth_installed');
    }
    const targetUrl = u.toString();

    if (orgId) await setOrgGHLOAuth(orgId, finalLocationId);

    console.log('[CQ Callback] STEP 8 — SUCCESS redirect to canonical URL', { targetUrl, postAuthBase, locationId: finalLocationId?.slice(0, 12) + '...' });

    if (orgId) {
      console.log('[CQ Callback] STEP 8a — setOrgGHLOAuth', { orgId, locationId: finalLocationId?.slice(0, 12) + '...' });
    }
    const res = NextResponse.redirect(targetUrl);
    const cookieOptions: { httpOnly: boolean; secure: boolean; sameSite: 'none'; maxAge: number; path: string; domain?: string } = {
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
          cookieOptions.domain = parts.length >= 3 ? parts.slice(-2).join('.') : callbackHost;
        }
      }
    } catch {
      /* ignore */
    }
    res.cookies.set('ghl_session', sessionToken, cookieOptions);
    console.log('[CQ Callback] STEP 9 — cookie set', { domain: (cookieOptions as { domain?: string }).domain ?? '(default)', path: '/', maxAge: cookieOptions.maxAge });
    console.log('[CQ Callback] ========== CALLBACK COMPLETE (redirecting to app) ==========');
    return res;
  } catch (error) {
    console.log('[CQ Callback] ========== CALLBACK EXCEPTION ==========');
    console.error('[CQ Callback] Error in OAuth callback:', error);
    const errorUrl = new URL('/oauth-success', APP_BASE);
    const msg = error instanceof Error ? error.message : 'oauth_callback_failed';
    errorUrl.searchParams.set('error', msg.includes('KV') || msg.includes('store') ? 'storage_failed' : 'oauth_callback_failed');
    errorUrl.searchParams.set('error_description', msg);
    return NextResponse.redirect(errorUrl.toString());
  }
}
