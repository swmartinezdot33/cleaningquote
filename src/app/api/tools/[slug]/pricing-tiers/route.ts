import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { Tool } from '@/lib/supabase/types';
import { loadPricingTable, getPricingTiers } from '@/lib/pricing/loadPricingTable';

export const dynamic = 'force-dynamic';

/**
 * GET - Public square footage tiers from this tool's pricing table (by slug).
 * Use so quote flow and survey options match the pricing chart.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }

    const supabase = createSupabaseServer();
    const { data: tool, error: toolErr } = await supabase
      .from('tools')
      .select('id')
      .eq('slug', slug)
      .single();

    if (toolErr || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }
    const toolId = (tool as Tool).id;

    const table = await loadPricingTable(toolId);
    const { tiers, maxSqFt } = getPricingTiers(table);

    return NextResponse.json({ tiers, maxSqFt });
  } catch (err) {
    if (err instanceof Error && err.message.includes('KV')) {
      return NextResponse.json({ tiers: [], maxSqFt: 0 });
    }
    if (err instanceof Error && err.message.includes('not configured')) {
      return NextResponse.json({ tiers: [], maxSqFt: 0 });
    }
    console.error('GET /api/tools/[slug]/pricing-tiers:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load pricing tiers' },
      { status: 500 }
    );
  }
}
