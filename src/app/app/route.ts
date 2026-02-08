/**
 * App Launch URL — matches MaidCentral flow.
 * If session exists → dashboard. Otherwise redirect to oauth/authorize (GHL marketplace flow).
 * Set Live URL to https://www.cleanquote.io/dashboard so returning users go straight in.
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

  // Already have session? Go to dashboard
  const sessionToken = request.cookies.get(GHL_SESSION_COOKIE)?.value;
  if (sessionToken) {
    const session = await verifySessionToken(sessionToken);
    if (session?.locationId) {
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
        return NextResponse.redirect(new URL(redirectTo, request.url));
      }
    } catch {
      /* continue to OAuth */
    }
  }

  // No session or token → start OAuth (MaidCentral flow)
  const authUrl = new URL('/api/auth/oauth/authorize', request.url);
  authUrl.searchParams.set('redirect', redirectTo);
  if (locationId) authUrl.searchParams.set('locationId', locationId);

  return NextResponse.redirect(authUrl.toString());
}
