import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndToolWithClient } from '@/lib/dashboard-auth';
import { getPricingTable } from '@/lib/kv';
import type { PricingTable } from '@/lib/pricing/types';
import { getPricingStructureIdFromConfig, setPricingStructureIdInConfig } from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';

export const dynamic = 'force-dynamic';

/** GET - List pricing structures for the tool's org and the tool's selected pricing structure id. In GHL context, only structures with matching ghl_location_id. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndToolWithClient(toolId);
  if (auth instanceof NextResponse) return auth;

  const supabase = auth.supabase;
  const orgId = auth.tool.org_id;
  let query = supabase
    .from('pricing_structures')
    .select('id, name, created_at, updated_at')
    .eq('org_id', orgId);
  const ghlSession = await getSession();
  if (ghlSession?.locationId) {
    query = query.eq('ghl_location_id', ghlSession.locationId);
  }
  const { data, error } = await query.order('name');

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
  const auth = await getDashboardUserAndToolWithClient(toolId);
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
    const { data: row } = await auth.supabase
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
  const auth = await getDashboardUserAndToolWithClient(toolId);
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

  const now = new Date().toISOString();
  const row = {
    org_id: auth.tool.org_id,
    tool_id: toolId,
    name,
    pricing_table: pricingTable ? (pricingTable as unknown as Record<string, unknown>) : null,
    created_at: now,
    updated_at: now,
  };

  const { data: inserted, error } = await auth.supabase
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
