import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';
import type { ServiceAreaInsert } from '@/lib/supabase/types';
import { parseKML } from '@/lib/service-area/parseKML';
import { fetchAndParseNetworkKML } from '@/lib/service-area/fetchNetworkKML';
import { normalizeServiceAreaPolygons, toStoredPolygons } from '@/lib/service-area/normalizePolygons';

export const dynamic = 'force-dynamic';

/** GET - List service areas for org (id, name, polygon point count, network_link_url). */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can manage service areas' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('service_areas')
    .select('id, name, polygon, network_link_url, network_link_fetched_at, created_at, updated_at')
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

  return NextResponse.json({ serviceAreas: list });
}

/** POST - Create service area. Body: { name, polygon? } or { name, kmlContent? } or { name, network_link_url? }. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can create service areas' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const now = new Date().toISOString();

  // Option 1: Direct polygon (single or array of polygons)
  if (body.polygon && Array.isArray(body.polygon)) {
    const stored = toStoredPolygons(body.polygon as import('@/lib/service-area/pointInPolygon').PolygonCoordinates | import('@/lib/service-area/pointInPolygon').PolygonCoordinates[]);
    if (stored.length === 0) {
      return NextResponse.json({ error: 'Provide at least one valid polygon (3+ points each)' }, { status: 400 });
    }
    const insert: ServiceAreaInsert = {
      org_id: orgId,
      name,
      polygon: stored as unknown as import('@/lib/supabase/types').Json,
      network_link_url: null,
      network_link_fetched_at: null,
      created_at: now,
      updated_at: now,
    };
    // @ts-expect-error Supabase Insert type can be never for new table
    const { data: row, error } = await supabase.from('service_areas').insert(insert).select('id, name, polygon').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ serviceArea: row });
  }

  // Option 2: KML file content (upload)
  if (typeof body.kmlContent === 'string' && body.kmlContent.trim()) {
    const parsed = parseKML(body.kmlContent.trim());
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    if (parsed.networkLink) {
      return NextResponse.json(
        { error: 'KML contains a NetworkLink. Use network_link_url to add a network link instead.' },
        { status: 400 }
      );
    }
    if (!parsed.polygons?.length) {
      return NextResponse.json({ error: 'No polygon coordinates found in KML' }, { status: 400 });
    }
    const stored = toStoredPolygons(parsed.polygons);
    const insert: ServiceAreaInsert = {
      org_id: orgId,
      name,
      polygon: stored as unknown as import('@/lib/supabase/types').Json,
      network_link_url: null,
      network_link_fetched_at: null,
      created_at: now,
      updated_at: now,
    };
    // @ts-expect-error Supabase Insert type can be never for new table
    const { data: row, error } = await supabase.from('service_areas').insert(insert).select('id, name, polygon').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ serviceArea: row });
  }

  // Option 3: Network link URL
  const networkLinkUrl = typeof body.network_link_url === 'string' ? body.network_link_url.trim() : '';
  if (networkLinkUrl) {
    const result = await fetchAndParseNetworkKML(networkLinkUrl);
    if (result.error || !result.polygons?.length) {
      return NextResponse.json(
        { error: result.error ?? 'No polygon data at URL' },
        { status: 400 }
      );
    }
    const stored = toStoredPolygons(result.polygons);
    const insert: ServiceAreaInsert = {
      org_id: orgId,
      name,
      polygon: stored as unknown as import('@/lib/supabase/types').Json,
      network_link_url: networkLinkUrl,
      network_link_fetched_at: now,
      created_at: now,
      updated_at: now,
    };
    // @ts-expect-error Supabase Insert type can be never for new table
    const { data: row, error } = await supabase.from('service_areas').insert(insert).select('id, name, polygon, network_link_url, network_link_fetched_at').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ serviceArea: row });
  }

  return NextResponse.json(
    { error: 'Provide polygon, kmlContent, or network_link_url' },
    { status: 400 }
  );
}
