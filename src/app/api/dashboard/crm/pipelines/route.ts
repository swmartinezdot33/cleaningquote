import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { listGHLPipelines } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/crm/pipelines
 * Returns GHL opportunity pipelines (and stages) for the current location.
 * Uses OAuth location token from resolveGHLContext.
 * @see https://marketplace.gohighlevel.com/docs/ghl/opportunities/get-pipelines
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api/dashboard/crm/pipelines/route.ts:GET:ctx', message: 'pipelines API context', data: { hasCtx: !!ctx, needsConnect: ctx && 'needsConnect' in ctx, locationIdPreview: ctx && 'locationId' in ctx ? `${(ctx as { locationId: string }).locationId.slice(0, 8)}..` : null }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {});
    // #endregion
    if (!ctx) {
      return NextResponse.json(
        { error: 'Location ID required', pipelines: [] },
        { status: 400 }
      );
    }
    if ('needsConnect' in ctx) {
      // Return 200 so the client can parse the body and show Connect CTA (same pattern as stats).
      return NextResponse.json({
        pipelines: [],
        needsConnect: true,
        error: 'Connect your location first',
      });
    }

    const pipelines = await listGHLPipelines(ctx.locationId, {
      token: ctx.token,
      locationId: ctx.locationId,
    });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api/dashboard/crm/pipelines/route.ts:GET:afterList', message: 'pipelines from listGHLPipelines', data: { count: pipelines?.length ?? 0, firstId: pipelines?.[0]?.id, firstKeys: pipelines?.[0] ? Object.keys(pipelines[0]) : [] }, timestamp: Date.now(), hypothesisId: 'H1-H3' }) }).catch(() => {});
    // #endregion
    return NextResponse.json({
      pipelines: pipelines.map((p) => ({
        id: p.id,
        name: p.name,
        stages: p.stages ?? [],
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api/dashboard/crm/pipelines/route.ts:catch', message: 'pipelines API error', data: { error: msg }, timestamp: Date.now(), hypothesisId: 'H3' }) }).catch(() => {});
    // #endregion
    console.warn('[CQ CRM pipelines]', msg);
    return NextResponse.json(
      { error: msg, pipelines: [] },
      { status: 500 }
    );
  }
}
