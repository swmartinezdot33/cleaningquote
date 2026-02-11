import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getDashboardLocationAndOrg } from '@/lib/dashboard-location';
import { normalizeServiceAreaPolygons } from '@/lib/service-area/normalizePolygons';
import { getLocationContactDetails } from '@/lib/ghl/location-contact';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/service-areas/map-data
 * Returns org office address and all service area polygons for the "View on service area map" modal.
 * Prefer GHL location (Business Profile) address when org has ghl_location_id.
 */
export async function GET(request: NextRequest) {
  const resolved = await getDashboardLocationAndOrg(request);
  if (resolved instanceof NextResponse) return resolved;
  const { orgId } = resolved;
  if (!orgId) {
    return NextResponse.json({ officeAddress: null, areas: [] });
  }

  const client = createSupabaseServer();

  const [orgResult, areasResult] = await Promise.all([
    client.from('organizations').select('office_address, ghl_location_id').eq('id', orgId).maybeSingle(),
    client
      .from('service_areas')
      .select('id, name, polygon, zone_display')
      .eq('org_id', orgId)
      .order('name'),
  ]);

  const orgRow = orgResult.data as { office_address?: string | null; ghl_location_id?: string | null } | null;
  let officeAddress: string | null = orgRow?.office_address ?? null;
  const ghlLocationId = orgRow?.ghl_location_id?.trim() || null;
  if (ghlLocationId) {
    const fromGhl = await getLocationContactDetails(ghlLocationId);
    if (fromGhl?.officeAddress) officeAddress = fromGhl.officeAddress;
  }
  const areasRaw = (areasResult.data ?? []) as Array<{
    id: string;
    name: string;
    polygon: unknown;
    zone_display: unknown;
  }>;

  const areas = areasRaw.map((row) => {
    const polygons = normalizeServiceAreaPolygons(row.polygon);
    const zd = Array.isArray(row.zone_display) ? row.zone_display : [];
    const zoneDisplay = polygons.map((_, i) => {
      const z = (zd[i] as { label?: string; color?: string } | undefined) ?? {};
      return { label: z.label ?? row.name, color: z.color ?? undefined };
    });
    return {
      id: row.id,
      name: row.name,
      polygons,
      zoneDisplay,
    };
  });

  return NextResponse.json({
    officeAddress: officeAddress && String(officeAddress).trim() ? officeAddress : null,
    areas,
  });
}
