import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { getOpportunities } from '@/lib/ghl/ghl-client';

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
      : Math.min(1000, Math.max(1, parseInt(limitParam || '100', 10) || 100));
    const statusFilter = 'open';
    const result = await getOpportunities(
      ctx.locationId,
      { token: ctx.token, locationId: ctx.locationId },
      { pipelineId, limit, status: statusFilter }
    );
    if (!result.ok) {
      const status = result.error.type === 'auth' ? 401 : 502;
      if (process.env.NODE_ENV !== 'test') {
        console.warn('[CQ CRM opportunities] getOpportunities failed', { pipelineId, error: result.error.message });
      }
      return NextResponse.json(
        { error: result.error.message, opportunities: [], retryable: result.error.retryable },
        { status }
      );
    }
    const opportunities = result.data.opportunities ?? [];
    const total = result.data.total ?? opportunities.length;
    if (process.env.NODE_ENV !== 'test') {
      console.info('[CQ CRM opportunities]', { pipelineId, count: opportunities.length, total });
    }
    return NextResponse.json({
      opportunities,
      total,
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
