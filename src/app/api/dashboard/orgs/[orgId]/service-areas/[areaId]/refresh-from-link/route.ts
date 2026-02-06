import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';
import { fetchAndParseNetworkKML } from '@/lib/service-area/fetchNetworkKML';
import { toStoredPolygons } from '@/lib/service-area/normalizePolygons';

export const dynamic = 'force-dynamic';

/** POST - Re-fetch KML from network_link_url and update polygon. */
export async function POST(
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

  const { data: area, error: fetchError } = await supabase
    .from('service_areas')
    .select('id, network_link_url')
    .eq('id', areaId)
    .eq('org_id', orgId)
    .single();

  if (fetchError || !area) {
    return NextResponse.json({ error: 'Service area not found' }, { status: 404 });
  }

  const url = (area as { network_link_url: string | null }).network_link_url;
  if (!url || !url.trim()) {
    return NextResponse.json({ error: 'Service area has no network link URL' }, { status: 400 });
  }

  const result = await fetchAndParseNetworkKML(url.trim());
  if (result.error || !result.polygons?.length) {
    return NextResponse.json(
      { error: result.error ?? 'No polygon data at URL' },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const stored = toStoredPolygons(result.polygons);
  const { error: updateError } = await supabase
    .from('service_areas')
    // @ts-expect-error Supabase Update type can be inferred as never for new table columns
    .update({
      polygon: stored as unknown as import('@/lib/supabase/types').Json,
      network_link_fetched_at: now,
      updated_at: now,
    })
    .eq('id', areaId)
    .eq('org_id', orgId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }
  const pointCount = stored.reduce((sum, p) => sum + p.length, 0);
  return NextResponse.json({
    success: true,
    polygonCount: stored.length,
    pointCount,
    fetchedAt: now,
  });
}
