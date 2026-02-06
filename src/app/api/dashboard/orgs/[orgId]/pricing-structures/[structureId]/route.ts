import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';
import { invalidatePricingCacheForStructure } from '@/lib/pricing/loadPricingTable';
import type { PricingTable } from '@/lib/pricing/types';

export const dynamic = 'force-dynamic';

/** GET - Get one pricing structure (with pricing_table). Structure must belong to org. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orgId: string; structureId: string }> }
) {
  const { orgId, structureId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can view pricing structures' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('pricing_structures')
    .select('id, name, pricing_table, created_at, updated_at')
    .eq('id', structureId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Pricing structure not found' }, { status: 404 });
  }

  const row = data as { id: string; name: string; pricing_table: unknown; created_at: string; updated_at: string };
  return NextResponse.json({
    pricingStructure: {
      id: row.id,
      name: row.name,
      pricingTable: row.pricing_table ?? null,
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
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can update pricing structures' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: { name?: string; pricing_table?: unknown; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.name === 'string' && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.pricingTable !== undefined) {
    updates.pricing_table = body.pricingTable;
  }

  const { data, error } = await supabase
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
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can delete pricing structures' }, { status: 403 });
  }

  const { error } = await supabase
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
