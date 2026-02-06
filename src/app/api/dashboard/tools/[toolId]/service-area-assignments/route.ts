import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';

export const dynamic = 'force-dynamic';

/** GET - Return assigned service area ids, names, and pricing structure per assignment. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createSupabaseServerSSR();
  const { data: assignments } = await supabase
    .from('tool_service_areas')
    .select('service_area_id, pricing_structure_id')
    .eq('tool_id', auth.tool.id);

  const ids = (assignments ?? []).map((a: { service_area_id: string }) => a.service_area_id);
  if (ids.length === 0) {
    return NextResponse.json({ serviceAreaIds: [], serviceAreas: [], assignments: [] });
  }

  const { data: areas } = await supabase
    .from('service_areas')
    .select('id, name')
    .in('id', ids);

  const areaMap = new Map((areas ?? []).map((a: { id: string; name: string }) => [a.id, a.name]));
  const serviceAreas = (areas ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
  const assignmentList = (assignments ?? []).map((a: { service_area_id: string; pricing_structure_id: string | null }) => ({
    serviceAreaId: a.service_area_id,
    serviceAreaName: areaMap.get(a.service_area_id) ?? '',
    pricingStructureId: a.pricing_structure_id ?? null,
  }));
  return NextResponse.json({ serviceAreaIds: ids, serviceAreas, assignments: assignmentList });
}

/** PUT - Replace tool's service area assignments. Body: { serviceAreaIds: string[] } or { assignments: { serviceAreaId: string, pricingStructureId?: string | null }[] }. */
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  let assignmentsInput: { serviceAreaId: string; pricingStructureId?: string | null }[] = [];

  if (Array.isArray(body.assignments)) {
    assignmentsInput = body.assignments
      .filter((a: unknown) => a && typeof a === 'object' && typeof (a as { serviceAreaId?: string }).serviceAreaId === 'string')
      .map((a: { serviceAreaId: string; pricingStructureId?: string | null }) => ({
        serviceAreaId: String(a.serviceAreaId).trim(),
        pricingStructureId: a.pricingStructureId === undefined ? null : (a.pricingStructureId ? String(a.pricingStructureId).trim() : null),
      }));
  } else {
    const raw = body.serviceAreaIds;
    const serviceAreaIds = Array.isArray(raw)
      ? raw.filter((id: unknown) => typeof id === 'string' && (id as string).trim()).map((id: string) => (id as string).trim())
      : [];
    assignmentsInput = serviceAreaIds.map((serviceAreaId: string) => ({ serviceAreaId, pricingStructureId: null as string | null }));
  }

  const serviceAreaIds = [...new Set(assignmentsInput.map((a) => a.serviceAreaId))];

  const supabase = await createSupabaseServerSSR();
  const { error: deleteError } = await supabase
    .from('tool_service_areas')
    .delete()
    .eq('tool_id', auth.tool.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 400 });
  }

  if (serviceAreaIds.length === 0) {
    return NextResponse.json({ serviceAreaIds: [], serviceAreas: [], assignments: [] });
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

  const pricingByArea = new Map(assignmentsInput.map((a) => [a.serviceAreaId, a.pricingStructureId ?? null]));
  const rows = serviceAreaIds.map((service_area_id: string) => ({
    tool_id: auth.tool.id,
    service_area_id,
    pricing_structure_id: pricingByArea.get(service_area_id) ?? null,
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
  const areaList = (areas ?? []) as { id: string; name: string }[];
  const assignmentList = serviceAreaIds.map((id: string) => ({
    serviceAreaId: id,
    serviceAreaName: areaList.find((a) => a.id === id)?.name ?? '',
    pricingStructureId: pricingByArea.get(id) ?? null,
  }));
  return NextResponse.json({ serviceAreaIds, serviceAreas, assignments: assignmentList });
}
