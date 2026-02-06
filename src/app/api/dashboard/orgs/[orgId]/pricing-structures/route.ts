import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';
import { getPricingTable } from '@/lib/kv';
import type { PricingTable } from '@/lib/pricing/types';

export const dynamic = 'force-dynamic';

/** GET - List pricing structures for this org */
export async function GET(
  _request: NextRequest,
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
    return NextResponse.json({ error: 'Only org admins can view pricing structures' }, { status: 403 });
  }

  const { data, error } = await supabase
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
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can create pricing structures' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  let pricingTable: PricingTable | null = null;
  if (typeof body.copyFromToolId === 'string' && body.copyFromToolId.trim()) {
    const toolId = body.copyFromToolId.trim();
    const { data: tool } = await supabase.from('tools').select('org_id').eq('id', toolId).single();
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
  };

  const { data: inserted, error } = await supabase
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
