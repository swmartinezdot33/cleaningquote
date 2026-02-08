/**
 * OAuth callback for marketplace app install
 * Exchanges authorization code for tokens, stores them, and creates session.
 */

import { NextRequest, NextResponse } from 'next/server';
import { storeInstallation } from '@/lib/ghl/token-store';
import { createSessionToken, setSessionCookie } from '@/lib/ghl/session';

const TOKEN_URL = 'https://services.leadconnectorhq.com/oauth/token';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const redirectTo = searchParams.get('redirect') || '/dashboard';

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
    // Marketplace install flow: only client_id, client_secret, grant_type, code (per ghl-marketplace-app-template)
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
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

    const locationId = data.locationId ?? null;
    const companyId = data.companyId ?? '';
    const userId = data.userId ?? '';

    if (!locationId) {
      console.error('OAuth: No locationId in token response. userType:', data.userType);
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
