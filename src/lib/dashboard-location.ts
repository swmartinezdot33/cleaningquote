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
 * If no org exists for this GHL location, we ensure one (create or link) so tools, service-areas, and pricing
 * routes always have an org to query — otherwise those counts stay 0 even when the user has data elsewhere.
 */
export async function getDashboardLocationAndOrg(
  request: NextRequest
): Promise<DashboardLocationResult | NextResponse> {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  const session = await getSession();
  const locationId = header ?? query ?? session?.locationId ?? null;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard-location.ts:getDashboardLocationAndOrg',message:'locationId resolution',data:{header:header?.slice(0,12),query:query?.slice(0,12),sessionLoc:session?.locationId?.slice(0,12),resolved:locationId?.slice(0,12),hypothesisId:'H1_H2'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

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
  if (orgIds.length === 0) {
    const ensured = await configStore.ensureOrgForGHLLocation(loc);
    if (ensured) orgIds = [ensured];
  }
  const orgId: string | null = orgIds[0] ?? null;

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'dashboard-location.ts:afterLookup',message:'org lookup result',data:{locFirst12:loc.slice(0,12),orgIdsLen:orgIds.length,orgIdFirst8:orgId?.slice(0,8),hypothesisId:'H1_H3'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return { locationId: loc, orgId, orgIds };
}
