/**
 * Single source of truth for resolving dashboard "current location" and its org.
 * Used by tools, service-areas, pricing-structures and any route that returns data
 * for the GHL location (organizations.ghl_location_id).
 *
 * Flow:
 * 1. locationId = x-ghl-location-id header (from client useDashboardApi) → locationId query → GHL session cookie.
 * 2. Resolve org from organizations.ghl_location_id; optionally ensure org exists.
 * 3. Return { locationId, orgId, orgIds } or a 401 NextResponse.
 *
 * Client must send locationId on every request (useDashboardApi does this from
 * effectiveLocationId, which comes from postMessage decrypt or sessionStorage set from that).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import * as configStore from '@/lib/config/store';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const LOCATION_REQUIRED_MESSAGE =
  'No location context. Open CleanQuote from your GoHighLevel location so we can load your data.';

export type DashboardLocationResult = {
  locationId: string;
  orgId: string | null;
  orgIds: string[];
};

/**
 * Resolve locationId from request (header → query → session), then resolve org from organizations.ghl_location_id.
 * Returns result or a 401 NextResponse. Use for all dashboard data routes (tools, service-areas, pricing-structures).
 */
export async function getDashboardLocationAndOrg(
  request: NextRequest,
  options?: { ensureOrg?: boolean }
): Promise<DashboardLocationResult | NextResponse> {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  const locationId = header ?? query ?? (await getSession())?.locationId ?? null;

  if (!locationId?.trim()) {
    return NextResponse.json(
      { error: LOCATION_REQUIRED_MESSAGE, code: 'LOCATION_REQUIRED' },
      { status: 401 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: LOCATION_REQUIRED_MESSAGE, code: 'SUPABASE_NOT_CONFIGURED' },
      { status: 401 }
    );
  }

  const loc = locationId.trim();
  let orgIds = await configStore.getOrgIdsByGHLLocationId(loc);
  let orgId: string | null = orgIds[0] ?? null;

  if (!orgId && options?.ensureOrg) {
    orgId = await configStore.ensureOrgForGHLLocation(loc);
    if (orgId) orgIds = [orgId];
  }

  return { locationId: loc, orgId, orgIds };
}
