import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { canManageOrg } from '@/lib/org-auth';
import * as configStore from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';
import { invalidatePricingCacheForStructure } from '@/lib/pricing/loadPricingTable';
import type { PricingTable } from '@/lib/pricing/types';

export const dynamic = 'force-dynamic';

async function resolveOrgAccess(orgId: string): Promise<{
  allowed: boolean;
  client: Awaited<ReturnType<typeof createSupabaseServerSSR>> | ReturnType<typeof createSupabaseServer>;
  isGHL: boolean;
}> {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
    return { allowed: canManage, client: supabase, isGHL: false };
  }
  const ghlSession = await getSession();
  if (ghlSession?.locationId) {
    const orgIds = await configStore.getOrgIdsByGHLLocationId(ghlSession.locationId);
    const allowed = orgIds.includes(orgId);
    return { allowed, client: allowed ? createSupabaseServer() : supabase, isGHL: true };
  }
  return { allowed: false, client: supabase, isGHL: true };
}

/** GET - Get one pricing structure (with pricing_table). Structure must belong to org. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orgId: string; structureId: string }> }
) {
  const { orgId, structureId } = await context.params;
  const { allowed, client } = await resolveOrgAccess(orgId);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await client
    .from('pricing_structures')
    .select('id, name, pricing_table, initial_cleaning_config, created_at, updated_at')
    .eq('id', structureId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Pricing structure not found' }, { status: 404 });
  }

  const row = data as { id: string; name: string; pricing_table: unknown; initial_cleaning_config: unknown; created_at: string; updated_at: string };
  return NextResponse.json({
    pricingStructure: {
      id: row.id,
      name: row.name,
      pricingTable: row.pricing_table ?? null,
      initialCleaningConfig: row.initial_cleaning_config ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  });
}

/** PATCH - Update name and/or pricing_table. Structure must belong to org. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; structureId: string }> }
) {
  const { orgId, structureId } = await context.params;
  const { allowed, client } = await resolveOrgAccess(orgId);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: { name?: string; pricing_table?: unknown; initial_cleaning_config?: unknown; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.pricingTable !== undefined) {
    updates.pricing_table = body.pricingTable;
  }
  if (body.initialCleaningConfig !== undefined) {
    updates.initial_cleaning_config = body.initialCleaningConfig;
  }

  const { data, error } = await client
    .from('pricing_structures')
    // @ts-expect-error Supabase generated types may not include pricing_structures table
    .update(updates)
    .eq('id', structureId)
    .eq('org_id', orgId)
    .select('id, name, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A pricing structure with this name already exists.' }, { status: 400 });
    }
    console.error('PATCH org pricing-structures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidatePricingCacheForStructure(structureId);
  const row = data as { id: string; name: string; updated_at: string };
  return NextResponse.json({
    pricingStructure: { id: row.id, name: row.name, updatedAt: row.updated_at },
  });
}

/** DELETE - Remove pricing structure. Structure must belong to org. */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ orgId: string; structureId: string }> }
) {
  const { orgId, structureId } = await context.params;
  const { allowed, client } = await resolveOrgAccess(orgId);
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await client
    .from('pricing_structures')
    .delete()
    .eq('id', structureId)
    .eq('org_id', orgId);

  if (error) {
    console.error('DELETE org pricing-structures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidatePricingCacheForStructure(structureId);
  return NextResponse.json({ success: true });
}
