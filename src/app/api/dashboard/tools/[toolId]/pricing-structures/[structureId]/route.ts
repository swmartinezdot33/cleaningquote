import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { invalidatePricingCacheForStructure } from '@/lib/pricing/loadPricingTable';
import type { PricingTable } from '@/lib/pricing/types';

export const dynamic = 'force-dynamic';

/** GET - Get one pricing structure (with pricing_table) */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string; structureId: string }> }
) {
  const { toolId, structureId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createSupabaseServerSSR();
  const { data, error } = await supabase
    .from('pricing_structures')
    .select('id, name, pricing_table, created_at, updated_at')
    .eq('id', structureId)
    .eq('tool_id', toolId)
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

/** PUT - Update name and/or pricing_table. Body: { name?: string, pricingTable?: PricingTable } */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ toolId: string; structureId: string }> }
) {
  const { toolId, structureId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

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

  const supabase = await createSupabaseServerSSR();
  const { data, error } = await supabase
    .from('pricing_structures')
    // @ts-expect-error Supabase generated types may not include pricing_structures table
    .update(updates)
    .eq('id', structureId)
    .eq('tool_id', toolId)
    .select('id, name, updated_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A pricing structure with this name already exists.' }, { status: 400 });
    }
    console.error('PUT pricing-structures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidatePricingCacheForStructure(structureId);
  const row = data as { id: string; name: string; updated_at: string };
  return NextResponse.json({
    pricingStructure: { id: row.id, name: row.name, updatedAt: row.updated_at },
  });
}

/** DELETE - Remove pricing structure. Service area assignments referencing it will have pricing_structure_id set to null. */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string; structureId: string }> }
) {
  const { toolId, structureId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createSupabaseServerSSR();
  const { error } = await supabase
    .from('pricing_structures')
    .delete()
    .eq('id', structureId)
    .eq('tool_id', toolId);

  if (error) {
    console.error('DELETE pricing-structures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidatePricingCacheForStructure(structureId);
  return NextResponse.json({ success: true });
}
