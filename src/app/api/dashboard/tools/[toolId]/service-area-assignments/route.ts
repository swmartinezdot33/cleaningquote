import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';

export const dynamic = 'force-dynamic';

/** GET - Return assigned service area ids (and names) for the tool. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createSupabaseServerSSR();
  const { data: assignments } = await supabase
    .from('tool_service_areas')
    .select('service_area_id')
    .eq('tool_id', auth.tool.id);

  const ids = (assignments ?? []).map((a: { service_area_id: string }) => a.service_area_id);
  if (ids.length === 0) {
    return NextResponse.json({ serviceAreaIds: [], serviceAreas: [] });
  }

  const { data: areas } = await supabase
    .from('service_areas')
    .select('id, name')
    .in('id', ids);

  const serviceAreas = (areas ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
  return NextResponse.json({ serviceAreaIds: ids, serviceAreas });
}

/** PUT - Replace tool's service area assignments. Body: { serviceAreaIds: string[] }. */
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const raw = body.serviceAreaIds;
  const serviceAreaIds = Array.isArray(raw)
    ? raw.filter((id: unknown) => typeof id === 'string' && id.trim()).map((id: string) => id.trim())
    : [];

  const supabase = await createSupabaseServerSSR();
  const { error: deleteError } = await supabase
    .from('tool_service_areas')
    .delete()
    .eq('tool_id', auth.tool.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  if (serviceAreaIds.length === 0) {
    return NextResponse.json({ serviceAreaIds: [], serviceAreas: [] });
  }

  const { data: areasCheck } = await supabase
    .from('service_areas')
    .select('id, org_id')
    .in('id', serviceAreaIds);
  const orgIds = new Set((areasCheck ?? []).map((a: { org_id: string }) => a.org_id));
  if (orgIds.size > 1 || (orgIds.size === 1 && !orgIds.has(auth.tool.org_id))) {
    return NextResponse.json(
      { error: 'All service areas must belong to the tool\'s organization' },
      { status: 400 }
    );
  }

  const rows = serviceAreaIds.map((service_area_id: string) => ({
    tool_id: auth.tool.id,
    service_area_id,
  }));

  // @ts-expect-error Supabase Insert type can be never for new table
  const { error: insertError } = await supabase.from('tool_service_areas').insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  const { data: areas } = await supabase
    .from('service_areas')
    .select('id, name')
    .in('id', serviceAreaIds);

  const serviceAreas = (areas ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
  return NextResponse.json({ serviceAreaIds, serviceAreas });
}
