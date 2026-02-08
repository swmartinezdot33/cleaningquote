/**
 * App Launch URL — see GHL_IFRAME_APP_AUTH.md.
 * Session or token for location → dashboard; else redirect to authorize with locationId + redirect.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, GHL_SESSION_COOKIE } from '@/lib/ghl/session';
import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';

function extractLocationIdFromReferrer(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const fromPath = url.pathname.match(/\/(?:v\d+\/)?location\/([^/]+)/i);
    if (fromPath?.[1]) return fromPath[1];
    return url.searchParams.get('locationId') ?? url.searchParams.get('location_id') ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('redirect') || '/dashboard';

  console.log('[CQ App] /app launch', { redirectTo });

  // Already have session? Go to dashboard
  const sessionToken = request.cookies.get(GHL_SESSION_COOKIE)?.value;
  if (sessionToken) {
    const session = await verifySessionToken(sessionToken);
    if (session?.locationId) {
      console.log('[CQ App] → redirect dashboard (session valid)');
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  }

  // Try locationId from query (GHL may append) or referrer (iframe)
  const locationId =
    request.nextUrl.searchParams.get('locationId') ??
    request.nextUrl.searchParams.get('location_id') ??
    extractLocationIdFromReferrer(request.headers.get('referer'));

  // If we have locationId, check if token already exists (returning user)
  if (locationId) {
    try {
      const token = await getOrFetchTokenForLocation(locationId);
      if (token) {
        console.log('[CQ App] → redirect dashboard (token for location exists)');
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
    } catch {
      /* continue to OAuth */
    }
  }

  // No session or token → start OAuth (see GHL_IFRAME_APP_AUTH.md)
  const authUrl = new URL('/api/auth/oauth/authorize', request.url);
  authUrl.searchParams.set('redirect', redirectTo);
  if (locationId) authUrl.searchParams.set('locationId', locationId);
  console.log('[CQ App] → redirect to authorize', { hasLocationId: !!locationId });

  return NextResponse.redirect(authUrl.toString());
}
