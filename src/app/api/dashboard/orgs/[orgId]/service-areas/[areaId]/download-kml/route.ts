import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';
import { polygonToKML, polygonsToKML } from '@/lib/service-area/polygonToKML';
import { normalizeServiceAreaPolygons } from '@/lib/service-area/normalizePolygons';

export const dynamic = 'force-dynamic';

/** GET - Return service area polygon as KML file (Content-Disposition: attachment). */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orgId: string; areaId: string }> }
) {
  const { orgId, areaId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('service_areas')
    .select('id, name, polygon')
    .eq('id', areaId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Service area not found' }, { status: 404 });
  }

  const row = data as { name: string; polygon: unknown };
  const polygons = normalizeServiceAreaPolygons(row.polygon);
  if (polygons.length === 0) {
    return NextResponse.json({ error: 'Service area has no polygon data' }, { status: 400 });
  }

  const name = (row.name || 'service-area').replace(/[^\w\s-]/g, '').trim() || 'service-area';
  const kml = polygons.length === 1
    ? polygonToKML(polygons[0], row.name || undefined)
    : polygonsToKML(polygons, row.name || undefined);
  const filename = `${name}.kml`;

  return new NextResponse(kml, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.google-earth.kml+xml',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
