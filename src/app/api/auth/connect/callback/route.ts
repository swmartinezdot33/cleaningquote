/**
 * OAuth callback for marketplace app install
 * Exchanges authorization code for tokens, stores by locationId for future iframe lookups.
 * When state contains orgId, links location to org (Supabase user flow).
 * Otherwise creates GHL session (standalone marketplace install).
 */

import { NextRequest, NextResponse } from 'next/server';
import { storeInstallation } from '@/lib/ghl/token-store';
import { createSessionToken, setSessionCookie } from '@/lib/ghl/session';
import { setOrgGHLOAuth } from '@/lib/config/store';

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

  // GHL may pass locationId in callback URL
  let locationId =
    searchParams.get('locationId') ??
    searchParams.get('location_id') ??
    searchParams.get('location') ??
    null;

  let redirectTo = '/dashboard';
  let orgId: string | null = null;
  if (stateRaw) {
    try {
      const state = new URLSearchParams(stateRaw);
      orgId = state.get('orgId');
      const r = state.get('redirect');
      if (r) redirectTo = r;
    } catch {
      /* ignore */
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

  // redirect_uri must EXACTLY match GHL app config
  const redirectUri = process.env.GHL_REDIRECT_URI?.trim();
  if (!redirectUri) {
    console.error('OAuth: GHL_REDIRECT_URI must be set to match GHL app Redirect URI exactly');
    return NextResponse.redirect(
      new URL('/login?error=server_config&message=GHL_REDIRECT_URI+not+configured', request.url)
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
      console.error('OAuth token exchange failed:', res.status, JSON.stringify(data));
      return NextResponse.redirect(
        new URL(`/login?error=token_exchange&message=${encodeURIComponent(String(data.message ?? data.error ?? 'Token exchange failed'))}`, request.url)
      );
    }

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

    // Fallback: parse state for locationId (chooselocation may encode it)
    if (!locationId && stateRaw) {
      try {
        const state = new URLSearchParams(stateRaw);
        locationId = state.get('locationId') ?? state.get('location_id') ?? null;
      } catch {
        /* ignore */
      }
      if (!locationId) {
        try {
          const parsed = JSON.parse(stateRaw);
          locationId = parsed.locationId ?? parsed.location_id ?? null;
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
    }

    // Fallback: fetch location from API using the token
    if (!locationId && data.access_token) {
      locationId = await fetchLocationFromToken(data.access_token, companyId);
    }

    if (!locationId) {
      console.error('OAuth: No locationId. Token keys:', Object.keys(data).join(', '));
      return NextResponse.redirect(
        new URL('/login?error=no_location&message=Installation+did+not+return+location', request.url)
      );
    }

    const expiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;

    await storeInstallation({
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? '',
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
