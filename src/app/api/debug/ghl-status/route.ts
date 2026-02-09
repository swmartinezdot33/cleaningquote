import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getInstallation, getAgencyToken } from '@/lib/ghl/token-store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/ghl-status
 * Load in browser or curl to see current GHL/KV state. No auth required.
 *
 * Query:
 *   ?locationId=xxx  — include KV lookup for this location (key, hasToken, userType)
 */
export async function GET(request: NextRequest) {
  const locationIdParam = request.nextUrl.searchParams.get('locationId')?.trim() ?? null;

  const session = await getSession();
  const hasAgencyToken = !!(await getAgencyToken());

  const response: Record<string, unknown> = {
    ok: true,
    timestamp: new Date().toISOString(),
    session: session
      ? {
          locationId: session.locationId ? `${session.locationId.slice(0, 8)}..${session.locationId.slice(-4)}` : null,
          hasLocationId: !!session.locationId,
        }
      : null,
    agencyTokenInKV: hasAgencyToken,
  };

  if (locationIdParam) {
    const install = await getInstallation(locationIdParam);
    response.kvLookup = {
      locationIdRequested: `${locationIdParam.slice(0, 8)}..${locationIdParam.slice(-4)}`,
      kvKey: `ghl:install:${locationIdParam}`,
      found: !!install,
      hasAccessToken: !!install?.accessToken,
      hasRefreshToken: !!install?.refreshToken,
      userType: install?.userType ?? null,
    };
  }

  return NextResponse.json(response, { status: 200 });
}
