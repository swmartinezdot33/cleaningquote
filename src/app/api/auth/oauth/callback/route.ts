import { NextRequest, NextResponse } from 'next/server';
import { storeInstallation } from '@/lib/ghl/token-store';

export const dynamic = 'force-dynamic';

function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}
const APP_BASE = getAppBaseUrl();

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

    const successUrl = new URL('/oauth-success', APP_BASE);
    successUrl.searchParams.set('success', 'oauth_installed');
    successUrl.searchParams.set('locationId', finalLocationId);
    return NextResponse.redirect(successUrl.toString());
  } catch (error) {
    console.error('[OAuth Callback] Error:', error);
    const url = new URL('/oauth-success', APP_BASE);
    url.searchParams.set('error', error instanceof Error ? error.message : 'oauth_callback_failed');
    return NextResponse.redirect(url.toString());
  }
}
