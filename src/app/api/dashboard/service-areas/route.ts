import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import * as configStore from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';
import { normalizeServiceAreaPolygons } from '@/lib/service-area/normalizePolygons';

export const dynamic = 'force-dynamic';

function locationIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  return header ?? query ?? null;
}

/**
 * GET /api/dashboard/service-areas
 * Same pattern as /api/dashboard/tools and /api/dashboard/crm/stats: locationId from request,
 * resolve org from org_ghl_settings, return list + orgId for mutates.
 */
export async function GET(request: NextRequest) {
  const requestLocationId = locationIdFromRequest(request);
  const ghlSession = await getSession();
  const locationId = requestLocationId ?? ghlSession?.locationId ?? null;

  if (!locationId || !isSupabaseConfigured()) {
    return NextResponse.json({ error: 'No location context. Open CleanQuote from your location in GoHighLevel.' }, { status: 401 });
  }

  let orgId: string | null = (await configStore.getOrgIdsByGHLLocationId(locationId))[0] ?? null;
  if (!orgId) orgId = await configStore.ensureOrgForGHLLocation(locationId);
  if (!orgId) {
    return NextResponse.json({ serviceAreas: [], orgId: null });
  }

  const client = createSupabaseServer();
  const { data, error } = await client
    .from('service_areas')
    .select('id, name, polygon, zone_display, network_link_url, network_link_fetched_at, created_at, updated_at')
    .eq('org_id', orgId)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const list = (data ?? []).map((row: { id: string; name: string; polygon: unknown; network_link_url: string | null }) => {
    const polygons = normalizeServiceAreaPolygons(row.polygon);
    const pointCount = polygons.reduce((sum, p) => sum + p.length, 0);
    return {
      id: row.id,
      name: row.name,
      pointCount,
      networkLinkUrl: row.network_link_url ?? undefined,
      hasPolygon: polygons.length > 0,
    };
  });

  return NextResponse.json({ serviceAreas: list, orgId });
}
