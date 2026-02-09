import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { canManageOrg } from '@/lib/org-auth';
import { getPricingTable } from '@/lib/kv';
import * as configStore from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';
import type { PricingTable } from '@/lib/pricing/types';

export const dynamic = 'force-dynamic';

/** True if this org is linked to the given GHL location (org_ghl_settings). */
async function canAccessOrgViaGHLLocation(orgId: string, locationId: string): Promise<boolean> {
  const orgIds = await configStore.getOrgIdsByGHLLocationId(locationId);
  return orgIds.includes(orgId);
}

function locationIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  return header ?? query ?? null;
}

/** GET - List pricing structures for this org */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  let allowed = false;
  let client = supabase;
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
      user ? { error: 'Only org admins can view pricing structures' } : { error: 'Unauthorized' },
      { status: user ? 403 : 401 }
    );
  }

  // Org is 1:1 with GHL location; show all pricing structures for this org (no ghl_location_id filter)
  const { data, error } = await client
    .from('pricing_structures')
    .select('id, name, created_at, updated_at')
    .eq('org_id', orgId)
    .order('name');

  if (error) {
    console.error('GET org pricing-structures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pricingStructures: (data ?? []).map((r: { id: string; name: string; created_at: string; updated_at: string }) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
}

/** POST - Create a pricing structure for the org. Body: { name: string, copyFromToolId?: string } or { name, pricingTable: PricingTable } */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  let allowed = false;
  let client: ReturnType<typeof createSupabaseServerSSR> | ReturnType<typeof createSupabaseServer> = supabase;
  if (user) {
    allowed = await canManageOrg(user.id, user.email ?? undefined, orgId);
  } else {
    const ghlSession = await getSession();
    const locationId = locationIdFromRequest(request) ?? ghlSession?.locationId ?? null;
    if (locationId) {
      allowed = await canAccessOrgViaGHLLocation(orgId, locationId);
      if (allowed) client = createSupabaseServer();
    }
  }
  if (!allowed) {
    return NextResponse.json(
      user ? { error: 'Only org admins can create pricing structures' } : { error: 'Unauthorized' },
      { status: user ? 403 : 401 }
    );
  }

  // Set ghl_location_id from request context so location-scoped lookups return this row.
  const requestLocationId = locationIdFromRequest(request);
  const ghlSessionForRow = await getSession();
  const locationIdForRow = requestLocationId ?? ghlSessionForRow?.locationId ?? null;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  let pricingTable: PricingTable | null = null;
  if (typeof body.copyFromToolId === 'string' && body.copyFromToolId.trim()) {
    const toolId = body.copyFromToolId.trim();
    const { data: tool } = await client.from('tools').select('org_id').eq('id', toolId).single();
    if (tool && (tool as { org_id: string }).org_id === orgId) {
      pricingTable = await getPricingTable(toolId);
    }
    if (!pricingTable?.rows?.length) {
      return NextResponse.json(
        { error: 'Tool has no default pricing, or tool not in this org. Save default pricing first or provide pricingTable.' },
        { status: 400 }
      );
    }
  } else if (body.pricingTable && body.pricingTable.rows && Array.isArray(body.pricingTable.rows)) {
    pricingTable = body.pricingTable as PricingTable;
  }

  const now = new Date().toISOString();
  const row = {
    org_id: orgId,
    tool_id: null as string | null,
    name,
    pricing_table: pricingTable ? (pricingTable as unknown as Record<string, unknown>) : null,
    created_at: now,
    updated_at: now,
    ...(locationIdForRow ? { ghl_location_id: locationIdForRow } : {}),
  };

  const { data: inserted, error } = await client
    .from('pricing_structures')
    // @ts-expect-error Supabase generated types may not include pricing_structures table
    .insert(row)
    .select('id, name, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A pricing structure with this name already exists for this org.' }, { status: 400 });
    }
    console.error('POST org pricing-structures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    pricingStructure: {
      id: (inserted as { id: string }).id,
      name: (inserted as { name: string }).name,
      createdAt: (inserted as { created_at: string }).created_at,
    },
  });
}
