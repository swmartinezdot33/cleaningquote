import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { canManageOrg } from '@/lib/org-auth';
import * as configStore from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';
import type { ServiceAreaInsert } from '@/lib/supabase/types';
import { parseKML } from '@/lib/service-area/parseKML';
import { fetchAndParseNetworkKML } from '@/lib/service-area/fetchNetworkKML';
import { normalizeServiceAreaPolygons, toStoredPolygons } from '@/lib/service-area/normalizePolygons';
import { parseCsvToZipCodes, zipCodesToPolygons } from '@/lib/service-area/zipCodeToPolygon';

export const dynamic = 'force-dynamic';

async function canAccessOrgViaGHLLocation(orgId: string, locationId: string): Promise<boolean> {
  const orgIds = await configStore.getOrgIdsByGHLLocationId(locationId);
  return orgIds.includes(orgId);
}

function locationIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  return header ?? query ?? null;
}

/** GET - List service areas for org (id, name, polygon point count, network_link_url). In GHL context, only areas with matching ghl_location_id. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  let allowed = false;
  let client: ReturnType<typeof createSupabaseServerSSR> | ReturnType<typeof createSupabaseServer> = supabase;
  const requestLocationId = locationIdFromRequest(request);
  if (user) {
    allowed = await canManageOrg(user.id, user.email ?? undefined, orgId);
  } else {
    const ghlSession = await getSession();
    const locationId = requestLocationId ?? ghlSession?.locationId ?? null;
    if (locationId) {
      allowed = await canAccessOrgViaGHLLocation(orgId, locationId);
      if (allowed) client = createSupabaseServer();
    }
  }
  if (!allowed) {
    return NextResponse.json(
      user ? { error: 'Only org admins can manage service areas' } : { error: 'Unauthorized' },
      { status: user ? 403 : 401 }
    );
  }

  const ghlSession = await getSession();
  const locationId = requestLocationId ?? ghlSession?.locationId ?? null;
  let query = client
    .from('service_areas')
    .select('id, name, polygon, zone_display, network_link_url, network_link_fetched_at, created_at, updated_at')
    .eq('org_id', orgId);
  if (locationId) {
    query = query.eq('ghl_location_id', locationId);
  }
  const { data, error } = await query.order('name');

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
    const zoneDisplay = Array.isArray(body.zone_display) ? (body.zone_display as import('@/lib/supabase/types').Json) : [];
    const insert: ServiceAreaInsert = {
      org_id: orgId,
      name,
      polygon: stored as unknown as import('@/lib/supabase/types').Json,
      zone_display: zoneDisplay as import('@/lib/supabase/types').Json,
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

  // Option 4: ZIP code CSV (or array of zip codes) – fetch ZCTA boundaries from Census
  const zipCsvContent = typeof body.zipCsvContent === 'string' ? body.zipCsvContent.trim() : '';
  const zipCodesArray = Array.isArray(body.zipCodes) ? body.zipCodes.filter((z: unknown) => typeof z === 'string').map((z: string) => z.trim()) : [];
  const zipCodes = zipCsvContent ? parseCsvToZipCodes(zipCsvContent) : zipCodesArray;
  if (zipCodes.length > 0) {
    const maxZips = 150;
    if (zipCodes.length > maxZips) {
      return NextResponse.json(
        { error: `Too many ZIP codes (${zipCodes.length}). Maximum ${maxZips} per import.` },
        { status: 400 }
      );
    }
    const result = await zipCodesToPolygons(zipCodes);
    if (result.polygons.length === 0) {
      return NextResponse.json(
        {
          error: result.failed.length === zipCodes.length
            ? 'Could not fetch boundaries for any ZIP code. Check that codes are valid US 5-digit ZIPs and try again.'
            : `No polygons could be fetched. Failed ZIPs: ${result.failed.slice(0, 20).join(', ')}${result.failed.length > 20 ? '…' : ''}.`,
        },
        { status: 400 }
      );
    }
    const stored = toStoredPolygons(result.polygons);
    const zoneDisplay = result.labels.map((label) => ({ label, color: undefined }));
    const insert: ServiceAreaInsert = {
      org_id: orgId,
      name,
      polygon: stored as unknown as import('@/lib/supabase/types').Json,
      zone_display: zoneDisplay as unknown as import('@/lib/supabase/types').Json,
      network_link_url: null,
      network_link_fetched_at: null,
      created_at: now,
      updated_at: now,
    };
    // @ts-expect-error Supabase Insert type can be never for new table
    const { data: row, error } = await supabase.from('service_areas').insert(insert).select('id, name, polygon').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({
      serviceArea: row,
      zipSummary: { requested: zipCodes.length, created: result.polygons.length, failed: result.failed.length, failedList: result.failed.slice(0, 30) },
    });
  }

  return NextResponse.json(
    { error: 'Provide polygon, kmlContent, network_link_url, or zipCsvContent/zipCodes' },
    { status: 400 }
  );
}
