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
    const limit = Math.min(
      100,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '50', 10) || 50)
    );
    const statusFilter = 'open';
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'opportunities/route.ts:GET', message: 'opportunities request', data: { pipelineId: pipelineId ?? null, limit, statusFilter, locationIdPreview: `${ctx.locationId.slice(0, 8)}..${ctx.locationId.slice(-4)}` }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {});
    // #endregion
    const { opportunities, total } = await searchGHLOpportunities(
      ctx.locationId,
      { pipelineId, limit, status: statusFilter },
      { token: ctx.token, locationId: ctx.locationId }
    );
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'opportunities/route.ts:GET:result', message: 'opportunities result', data: { count: opportunities.length, total: total ?? null }, timestamp: Date.now(), hypothesisId: 'H5' }) }).catch(() => {});
    // #endregion
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
