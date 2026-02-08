/**
 * OAuth callback for marketplace app install
 * Exchanges authorization code for tokens, stores them.
 * When state contains orgId, links location to org (Supabase user flow).
 * Otherwise creates GHL session (standalone marketplace install).
 */

import { NextRequest, NextResponse } from 'next/server';
import { storeInstallation } from '@/lib/ghl/token-store';
import { createSessionToken, setSessionCookie } from '@/lib/ghl/session';
import { setOrgGHLOAuth } from '@/lib/config/store';

const TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const stateRaw = searchParams.get('state');

  let redirectTo = '/dashboard';
  let orgId: string | null = null;
  if (stateRaw) {
    try {
      const state = new URLSearchParams(stateRaw);
      orgId = state.get('orgId');
      const r = state.get('redirect');
      if (r) redirectTo = r;
    } catch {
      // ignore parse errors
    }
  }

  if (error) {
    console.error('OAuth callback error:', error, searchParams.get('error_description'));
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/login?error=missing_code', request.url)
    );
  }

  const clientId = process.env.GHL_CLIENT_ID;
  const clientSecret = process.env.GHL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('OAuth: Missing env vars (GHL_CLIENT_ID, GHL_CLIENT_SECRET)');
    return NextResponse.redirect(
      new URL('/login?error=server_config', request.url)
    );
  }

  try {
    // Build redirect_uri to match GHL app config (required for token exchange)
    const baseUrl = process.env.APP_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : new URL(request.url).origin);
    const redirectUri = process.env.GHL_REDIRECT_URI || `${baseUrl}/api/auth/connect/callback`;

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
      console.error('OAuth token exchange failed:', res.status, data);
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange&message=${encodeURIComponent(data.message || data.error || 'Unknown error')}`, request.url)
      );
    }

    let locationId =
      data.locationId ??
      data.location_id ??
      data.location?.id ??
      null;
    const companyId = data.companyId ?? data.company_id ?? '';
    const userId = data.userId ?? data.user_id ?? '';

    // Fallback: parse state for locationId (from chooselocation flow)
    if (!locationId && stateRaw) {
      try {
        const state = JSON.parse(stateRaw);
        locationId = state.locationId ?? state.location_id ?? null;
      } catch {
        try {
          const decoded = Buffer.from(stateRaw, 'base64').toString('utf-8');
          const parsed = JSON.parse(decoded);
          locationId = parsed.locationId ?? parsed.location_id ?? null;
        } catch {
          /* ignore */
        }
      }
    }

    // Fallback: fetch first location from API
    if (!locationId && data.access_token) {
      try {
        const locRes = await fetch('https://services.leadconnectorhq.com/locations/', {
          headers: {
            Authorization: `Bearer ${data.access_token}`,
            Version: '2021-04-15',
            'Content-Type': 'application/json',
          },
        });
        if (locRes.ok) {
          const locData = await locRes.json();
          const locs = locData.locations ?? (Array.isArray(locData) ? locData : [locData]);
          if (locs?.length > 0) {
            locationId = locs[0].id ?? locs[0].locationId ?? null;
          }
        }
      } catch {
        /* ignore */
      }
    }

    if (!locationId) {
      console.error('OAuth: No locationId in token response. userType:', data.userType, 'keys:', Object.keys(data));
      return NextResponse.redirect(
        new URL('/login?error=no_location&message=Installation+did+not+return+location', request.url)
      );
    }

    const expiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;

    await storeInstallation({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      companyId,
      userId,
      locationId,
    });

    if (orgId) {
      await setOrgGHLOAuth(orgId, locationId);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    const sessionToken = await createSessionToken({ locationId, companyId, userId });
    await setSessionCookie(sessionToken);
    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(
      new URL('/login?error=callback_error', request.url)
    );
  }
}
