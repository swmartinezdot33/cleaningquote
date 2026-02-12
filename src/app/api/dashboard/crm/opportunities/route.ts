import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { searchGHLOpportunities } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/crm/opportunities?pipelineId=xxx
 * Returns GHL opportunities for the current location, optionally filtered by pipeline.
 * Uses OAuth location token from resolveGHLContext.
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) {
      return NextResponse.json(
        { error: 'Location ID required', opportunities: [] },
        { status: 400 }
      );
    }
    if ('needsConnect' in ctx) {
      return NextResponse.json({
        opportunities: [],
        needsConnect: true,
        error: 'Connect your location first',
      });
    }

    const pipelineId = request.nextUrl.searchParams.get('pipelineId')?.trim() || undefined;
    const limitParam = request.nextUrl.searchParams.get('limit')?.trim();
    const limit = limitParam === 'all' || limitParam === ''
      ? 1000
      : Math.min(1000, Math.max(1, parseInt(limitParam || '1000', 10) || 1000));
    const statusFilter = 'open';
    const { opportunities, total } = await searchGHLOpportunities(
      ctx.locationId,
      { pipelineId, limit, status: statusFilter },
      { token: ctx.token, locationId: ctx.locationId }
    );
    return NextResponse.json({
      opportunities,
      total: total ?? opportunities.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[CQ CRM opportunities]', msg);
    return NextResponse.json(
      { error: msg, opportunities: [] },
      { status: 500 }
    );
  }
}
