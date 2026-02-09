import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import * as configStore from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';

export const dynamic = 'force-dynamic';

function locationIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  return header ?? query ?? null;
}

/**
 * GET /api/dashboard/pricing-structures
 * Same pattern as /api/dashboard/tools and /api/dashboard/crm/stats: locationId from request,
 * resolve org from org_ghl_settings, return list + orgId for mutates.
 */
export async function GET(request: NextRequest) {
  const requestLocationId = locationIdFromRequest(request);
  const ghlSession = await getSession();
  const locationId = requestLocationId ?? ghlSession?.locationId ?? null;

  if (!locationId || !isSupabaseConfigured()) {
    return NextResponse.json({ error: 'No location context. Open CleanQuote from your location in GoHighLevel.' }, { status: 401 });
  }

  let orgId: string | null = (await configStore.getOrgIdsByGHLLocationId(locationId))[0] ?? null;
  if (!orgId) orgId = await configStore.ensureOrgForGHLLocation(locationId);
  if (!orgId) {
    return NextResponse.json({ pricingStructures: [], orgId: null });
  }

  const client = createSupabaseServer();
  const { data, error } = await client
    .from('pricing_structures')
    .select('id, name, created_at, updated_at')
    .eq('org_id', orgId)
    .order('name');

  if (error) {
    console.error('GET dashboard pricing-structures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pricingStructures = (data ?? []).map((r: { id: string; name: string; created_at: string; updated_at: string }) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ pricingStructures, orgId });
}
