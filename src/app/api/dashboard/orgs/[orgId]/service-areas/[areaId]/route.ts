import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';
import type { ServiceAreaUpdate } from '@/lib/supabase/types';
import { toStoredPolygons } from '@/lib/service-area/normalizePolygons';

export const dynamic = 'force-dynamic';

/** GET - Get one service area (for edit). */
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
    .select('id, org_id, name, polygon, network_link_url, network_link_fetched_at, created_at, updated_at')
    .eq('id', areaId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Service area not found' }, { status: 404 });
  }

  return NextResponse.json({ serviceArea: data });
}

/** PATCH - Update name and/or polygon. */
export async function PATCH(
  request: NextRequest,
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

  const body = await request.json().catch(() => ({}));
  const updates: ServiceAreaUpdate = { updated_at: new Date().toISOString() };

  if (typeof body.name === 'string') {
    const name = body.name.trim();
    if (name) updates.name = name;
  }
  if (body.polygon !== undefined) {
    if (body.polygon === null) {
      updates.polygon = null;
    } else if (Array.isArray(body.polygon)) {
      const stored = toStoredPolygons(body.polygon as import('@/lib/service-area/pointInPolygon').PolygonCoordinates | import('@/lib/service-area/pointInPolygon').PolygonCoordinates[]);
      if (stored.length > 0) {
        updates.polygon = stored as unknown as ServiceAreaUpdate['polygon'];
      }
    }
  }
  if (body.network_link_url !== undefined) {
    updates.network_link_url = typeof body.network_link_url === 'string' ? body.network_link_url.trim() || null : null;
  }

  const { data, error } = await supabase
    .from('service_areas')
    // @ts-expect-error Supabase Update type can be inferred as never for new table
    .update(updates)
    .eq('id', areaId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ serviceArea: data });
}

/** DELETE - Delete service area and remove from tool_service_areas. */
export async function DELETE(
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

  const { error } = await supabase
    .from('service_areas')
    .delete()
    .eq('id', areaId)
    .eq('org_id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
