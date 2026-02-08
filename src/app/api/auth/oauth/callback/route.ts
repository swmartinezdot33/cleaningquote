import { NextRequest, NextResponse } from 'next/server';
import { storeInstallation } from '@/lib/ghl/token-store';
import { createSessionToken, setSessionCookie } from '@/lib/ghl/session';
import { setOrgGHLOAuth } from '@/lib/config/store';

export const dynamic = 'force-dynamic';

function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}
const APP_BASE = getAppBaseUrl();

function parseState(state: string | null): { redirect: string; orgId?: string } {
  const fallback = { redirect: '/oauth-success' };
  if (!state) return fallback;

  // Connect flow: state = "orgId=xxx&redirect=/dashboard"
  try {
    const params = new URLSearchParams(state);
    const redirect = params.get('redirect');
    const orgId = params.get('orgId');
    if (redirect && redirect.startsWith('/')) {
      return { redirect, orgId: orgId ?? undefined };
    }
  } catch {
    /* not URLSearchParams */
  }

  // OAuth flow: state = base64(JSON) or JSON
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const r = parsed?.redirect;
    return {
      redirect: typeof r === 'string' && r.startsWith('/') ? r : '/oauth-success',
      orgId: parsed?.orgId,
    };
  } catch {
    try {
      const parsed = JSON.parse(state);
      const r = parsed?.redirect;
      return {
        redirect: typeof r === 'string' && r.startsWith('/') ? r : '/oauth-success',
        orgId: parsed?.orgId,
      };
    } catch {
      return fallback;
    }
  }
}

/**
 * GET /api/auth/oauth/callback
 * Handles GHL OAuth callback, stores tokens in KV (matches MaidCentral flow).
 */
export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const locationIdParam = request.nextUrl.searchParams.get('locationId');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      const desc = request.nextUrl.searchParams.get('error_description') || 'OAuth error';
      const url = new URL('/oauth-success', APP_BASE);
      url.searchParams.set('error', error);
      url.searchParams.set('error_description', desc);
      return NextResponse.redirect(url.toString());
    }

    if (!code) {
      const url = new URL('/oauth-success', APP_BASE);
      url.searchParams.set('error', 'no_code');
      return NextResponse.redirect(url.toString());
    }

    const clientId = process.env.GHL_CLIENT_ID;
    const clientSecret = process.env.GHL_CLIENT_SECRET;
    const redirectUri = process.env.GHL_REDIRECT_URI || `${APP_BASE}/api/auth/oauth/callback`;

    if (!clientId || !clientSecret) {
      const url = new URL('/oauth-success', APP_BASE);
      url.searchParams.set('error', 'oauth_not_configured');
      return NextResponse.redirect(url.toString());
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[OAuth Callback] Token exchange failed:', tokenRes.status, errText);
      const url = new URL('/oauth-success', APP_BASE);
      url.searchParams.set('error', 'token_exchange_failed');
      url.searchParams.set('error_description', errText.slice(0, 200));
      return NextResponse.redirect(url.toString());
    }

    const tokenData = await tokenRes.json();

    let finalLocationId =
      locationIdParam ||
      tokenData.locationId ||
      tokenData.location_id ||
      tokenData.location?.id;

    if (!finalLocationId && state) {
      try {
        const decoded = Buffer.from(state, 'base64').toString('utf-8');
        const parsed = JSON.parse(decoded);
        finalLocationId = parsed.locationId || parsed.location_id;
      } catch {
        try {
          finalLocationId = JSON.parse(state).locationId;
        } catch {
          /* ignore */
        }
      }
    }

    if (!finalLocationId) {
      const accessToken = tokenData.access_token;
      if (accessToken) {
        try {
          const locRes = await fetch('https://services.leadconnectorhq.com/locations/', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Version: '2021-04-15',
              'Content-Type': 'application/json',
            },
          });
          if (locRes.ok) {
            const locData = await locRes.json();
            const locs = locData.locations ?? (Array.isArray(locData) ? locData : [locData]);
            if (locs?.length > 0) {
              finalLocationId = locs[0].id ?? locs[0].locationId;
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    if (!finalLocationId) {
      const url = new URL('/oauth-success', APP_BASE);
      url.searchParams.set('error', 'no_location_id');
      return NextResponse.redirect(url.toString());
    }

    const expiresAt = tokenData.expires_in
      ? Date.now() + tokenData.expires_in * 1000
      : Date.now() + 86400 * 1000;

    await storeInstallation({
      locationId: finalLocationId,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? '',
      expiresAt,
      companyId: tokenData.companyId ?? tokenData.company_id ?? '',
      userId: tokenData.userId ?? tokenData.user_id ?? '',
    });

    const { redirect: redirectTo, orgId } = parseState(state);
    const companyId = tokenData.companyId ?? tokenData.company_id ?? '';
    const userId = tokenData.userId ?? tokenData.user_id ?? '';

    // Set session cookie so dashboard works (matches connect flow)
    const sessionToken = await createSessionToken({
      locationId: finalLocationId,
      companyId,
      userId,
    });

    let targetUrl: string;
    if (redirectTo === '/oauth-success') {
      const u = new URL('/oauth-success', APP_BASE);
      u.searchParams.set('success', 'oauth_installed');
      u.searchParams.set('locationId', finalLocationId);
      targetUrl = u.toString();
    } else {
      targetUrl = new URL(redirectTo, APP_BASE).toString();
    }

    if (orgId) {
      await setOrgGHLOAuth(orgId, finalLocationId);
    }

    const res = NextResponse.redirect(targetUrl);
    res.cookies.set('ghl_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    const url = new URL('/oauth-success', APP_BASE);
    url.searchParams.set('error', error instanceof Error ? error.message : 'oauth_callback_failed');
    return NextResponse.redirect(url.toString());
  }
}
