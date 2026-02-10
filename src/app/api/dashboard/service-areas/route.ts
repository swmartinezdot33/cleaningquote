import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { normalizeServiceAreaPolygons } from '@/lib/service-area/normalizePolygons';
import { getDashboardLocationAndOrg } from '@/lib/dashboard-location';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/service-areas - locationId from request/session → organizations.ghl_location_id → org → service areas. */
export async function GET(request: NextRequest) {
  const resolved = await getDashboardLocationAndOrg(request, { ensureOrg: true });
  if (resolved instanceof NextResponse) return resolved;
  const { orgId } = resolved;
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
