import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { canManageOrg } from '@/lib/org-auth';
import * as configStore from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';
import type { ServiceAreaUpdate } from '@/lib/supabase/types';
import { toStoredPolygons } from '@/lib/service-area/normalizePolygons';

export const dynamic = 'force-dynamic';

function locationIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  return header ?? query ?? null;
}

async function canAccessOrgViaGHLLocation(orgId: string, locationId: string): Promise<boolean> {
  const orgIds = await configStore.getOrgIdsByGHLLocationId(locationId);
  return orgIds.includes(orgId);
}

async function resolveAccess(
  request: NextRequest,
  orgId: string
): Promise<{
  allowed: boolean;
  client: Awaited<ReturnType<typeof createSupabaseServerSSR>> | ReturnType<typeof createSupabaseServer>;
}> {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
    return { allowed: canManage, client: supabase };
  }
  const locationId = locationIdFromRequest(request) ?? (await getSession())?.locationId ?? null;
  if (locationId && (await canAccessOrgViaGHLLocation(orgId, locationId))) {
    return { allowed: true, client: createSupabaseServer() };
  }
  return { allowed: false, client: supabase };
}

/** GET - Get one service area (for edit). Auth: Supabase user or GHL iframe (locationId from request). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; areaId: string }> }
) {
  const { orgId, areaId } = await context.params;
  const { allowed, client } = await resolveAccess(request, orgId);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await client
    .from('service_areas')
    .select('id, org_id, name, polygon, zone_display, network_link_url, network_link_fetched_at, created_at, updated_at')
    .eq('id', areaId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Service area not found' }, { status: 404 });
  }

  return NextResponse.json({ serviceArea: data });
}

/** PATCH - Update name and/or polygon. Auth: Supabase user or GHL iframe (locationId from request). */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; areaId: string }> }
) {
  const { orgId, areaId } = await context.params;
  const { allowed, client } = await resolveAccess(request, orgId);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: ServiceAreaUpdate & { ghl_location_id?: string | null } = { updated_at: new Date().toISOString() };
  const requestLocationId = locationIdFromRequest(request);
  const ghlSession = await getSession();
  const locationIdForRow = requestLocationId ?? ghlSession?.locationId ?? null;
  if (locationIdForRow) {
    updates.ghl_location_id = locationIdForRow;
  }

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
  if (body.zone_display !== undefined) {
    updates.zone_display = Array.isArray(body.zone_display)
      ? (body.zone_display as unknown as ServiceAreaUpdate['zone_display'])
      : null;
  }
  if (body.network_link_url !== undefined) {
    updates.network_link_url = typeof body.network_link_url === 'string' ? body.network_link_url.trim() || null : null;
  }

  const { data, error } = await client
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

/** DELETE - Delete service area and remove from tool_service_areas. Auth: Supabase user or GHL iframe. */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; areaId: string }> }
) {
  const { orgId, areaId } = await context.params;
  const { allowed, client } = await resolveAccess(request, orgId);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await client
    .from('service_areas')
    .delete()
    .eq('id', areaId)
    .eq('org_id', orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
