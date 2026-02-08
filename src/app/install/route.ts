/**
 * GET /install?locationId=xxx
 * Sets ghl_pending_location_id cookie and redirects to the GHL app install URL in the same tab.
 * Open this URL in a new tab (target="_blank") so the full OAuth flow runs in that tab and the
 * cookie is preserved when GHL redirects back to our callback (avoids losing state from iframe).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getGHLInstallUrl } from '@/lib/ghl/oauth-utils';

const PENDING_COOKIE = 'ghl_pending_location_id';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const locationId = request.nextUrl.searchParams.get('locationId') ?? request.nextUrl.searchParams.get('location_id');
  const installUrl = getGHLInstallUrl();
  const res = NextResponse.redirect(installUrl);
  if (locationId?.trim()) {
    res.cookies.set(PENDING_COOKIE, locationId.trim(), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
  }
  return res;
}
