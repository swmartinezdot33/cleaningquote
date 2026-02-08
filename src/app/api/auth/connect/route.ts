/**
 * Redirect to GHL OAuth (marketplace flow).
 * Used for org-level GHL connection from Settings.
 * Pass orgId in state so callback can link location to org.
 * Delegates to oauth/authorize so we use a single redirect URI.
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const authUrl = new URL('/api/auth/oauth/authorize', request.url);
  authUrl.searchParams.set('redirect', redirectTo);
  if (orgId) authUrl.searchParams.set('orgId', orgId);
  const locationId = searchParams.get('locationId');
  if (locationId) authUrl.searchParams.set('locationId', locationId);

  return NextResponse.redirect(authUrl.toString());
}
