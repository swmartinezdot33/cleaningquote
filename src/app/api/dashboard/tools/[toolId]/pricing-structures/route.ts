import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getPricingTable } from '@/lib/kv';
import type { PricingTable } from '@/lib/pricing/types';
import { getPricingStructureIdFromConfig, setPricingStructureIdInConfig } from '@/lib/config/store';

export const dynamic = 'force-dynamic';

/** GET - List pricing structures for the tool's org and the tool's selected pricing structure id */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  const supabase = await createSupabaseServerSSR();
  const orgId = auth.tool.org_id;
  const { data, error } = await supabase
    .from('pricing_structures')
    .select('id, name, created_at, updated_at')
    .eq('org_id', orgId)
    .order('name');

  if (error) {
    console.error('GET pricing-structures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const selectedPricingStructureId = await getPricingStructureIdFromConfig(toolId);

  return NextResponse.json({
    pricingStructures: (data ?? []).map((r: { id: string; name: string; created_at: string; updated_at: string }) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    selectedPricingStructureId,
  });
}

/** PATCH - Set the tool's selected pricing structure. Body: { pricingStructureId: string | null } */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const raw = body.pricingStructureId;
  const pricingStructureId =
    raw === null || raw === undefined
      ? null
      : typeof raw === 'string' && raw.trim()
        ? raw.trim()
        : null;

  if (pricingStructureId) {
    const supabase = await createSupabaseServerSSR();
    const { data: row } = await supabase
      .from('pricing_structures')
      .select('id, org_id')
      .eq('id', pricingStructureId)
      .single();
    if (!row || (row as { org_id: string }).org_id !== auth.tool.org_id) {
      return NextResponse.json({ error: 'Pricing structure not found or not in this org' }, { status: 400 });
    }
  }

  await setPricingStructureIdInConfig(pricingStructureId, toolId);
  return NextResponse.json({ selectedPricingStructureId: pricingStructureId });
}

/** POST - Create a pricing structure. Body: { name: string, copyFromDefault?: boolean } or { name, pricingTable: PricingTable } */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  let pricingTable: PricingTable | null = null;
  if (body.copyFromDefault === true) {
    pricingTable = await getPricingTable(toolId);
    if (!pricingTable?.rows?.length) {
      return NextResponse.json(
        { error: 'Tool has no default pricing. Save default pricing first, or provide pricingTable.' },
        { status: 400 }
      );
    }
  } else if (body.pricingTable && body.pricingTable.rows && Array.isArray(body.pricingTable.rows)) {
    pricingTable = body.pricingTable as PricingTable;
  }

  const supabase = await createSupabaseServerSSR();
  const now = new Date().toISOString();
  const row = {
    org_id: auth.tool.org_id,
    tool_id: toolId,
    name,
    pricing_table: pricingTable ? (pricingTable as unknown as Record<string, unknown>) : null,
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error } = await supabase
    .from('pricing_structures')
    // @ts-expect-error Supabase generated types may not include pricing_structures table
    .insert(row)
    .select('id, name, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A pricing structure with this name already exists for this tool.' }, { status: 400 });
    }
    console.error('POST pricing-structures:', error);
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
