import { NextRequest, NextResponse } from 'next/server';
import { getInstallation } from '@/lib/ghl/token-store';
import { getLocationIdFromRequest } from '@/lib/request-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/ghl/kv-check?locationId=...
 * Returns whether we have an installation (tokens) in KV for the given locationId.
 * Proof only: exists (no tokens or secrets). Use to verify storage after OAuth callback.
 */
export async function GET(request: NextRequest) {
  const locationId = getLocationIdFromRequest(request);
  if (!locationId) {
    return NextResponse.json(
      { error: 'Missing locationId', usage: '?locationId=... or x-ghl-location-id header' },
      { status: 400 }
    );
  }
  const install = await getInstallation(locationId);
  const exists = !!install;
  return NextResponse.json({
    locationIdLookedUp: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
    kvKey: `ghl:install:${locationId.slice(0, 8)}..`,
    tokenExistsInKV: exists,
    hasAccessToken: !!(install?.accessToken),
    hasRefreshToken: !!(install?.refreshToken),
  });
}
