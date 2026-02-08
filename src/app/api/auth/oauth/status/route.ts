import { NextRequest, NextResponse } from 'next/server';
import { getInstallation } from '@/lib/ghl/token-store';
import { getLocationIdFromRequest } from '@/lib/request-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/oauth/status
 * Check OAuth installation status for a location. See GHL_IFRAME_APP_AUTH.md.
 */
export async function GET(request: NextRequest) {
  try {
    const locationId = getLocationIdFromRequest(request) || request.nextUrl.searchParams.get('locationId');

    if (!locationId) {
      console.log('[CQ OAuth status] no locationId');
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    const install = await getInstallation(locationId);
    const hasToken = !!(install?.accessToken);
    const installed = hasToken;
    console.log('[CQ OAuth status] check', { locationId: locationId.slice(0, 12) + '...', installed, hasToken });

    return NextResponse.json({
      installed,
      locationId,
      hasToken: hasToken,
      isExpired: false,
      canRefresh: !!install?.refreshToken,
    });
  } catch (error) {
    console.error('[CQ OAuth status] error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check OAuth status' },
      { status: 500 }
    );
  }
}
