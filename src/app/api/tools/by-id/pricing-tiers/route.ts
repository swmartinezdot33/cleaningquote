import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { loadPricingTable, getPricingTiers } from '@/lib/pricing/loadPricingTable';

export const dynamic = 'force-dynamic';

/**
 * GET - Public square footage tiers from this tool's pricing table.
 * Use so quote flow and survey options match the pricing chart (e.g. 7250 vs 7750 map to correct tiers).
 */
export async function GET(request: NextRequest) {
  try {
    const toolId = request.nextUrl.searchParams.get('toolId');
    if (!toolId || typeof toolId !== 'string' || !toolId.trim()) {
      return NextResponse.json({ error: 'toolId query param required' }, { status: 400 });
    }
    const id = toolId.trim();

    const supabase = createSupabaseServer();
    const { data: tool } = await supabase.from('tools').select('id').eq('id', id).single();
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const table = await loadPricingTable(id);
    const { tiers, maxSqFt } = getPricingTiers(table);

    return NextResponse.json({ tiers, maxSqFt });
  } catch (err) {
    if (err instanceof Error && err.message.includes('KV')) {
      return NextResponse.json({ tiers: [], maxSqFt: 0 });
    }
    if (err instanceof Error && err.message.includes('not configured')) {
      return NextResponse.json({ tiers: [], maxSqFt: 0 });
    }
    console.error('GET /api/tools/by-id/pricing-tiers:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load pricing tiers' },
      { status: 500 }
    );
  }
}
