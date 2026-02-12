import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { getPipelines } from '@/lib/ghl/ghl-client';

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
    if (!ctx) {
      return NextResponse.json(
        { error: 'Location ID required', pipelines: [] },
        { status: 400 }
      );
    }
    if ('needsConnect' in ctx) {
      return NextResponse.json({
        pipelines: [],
        needsConnect: true,
        error: 'Connect your location first',
      });
    }

    const result = await getPipelines(ctx.locationId, {
      token: ctx.token,
      locationId: ctx.locationId,
    });
    if (!result.ok) {
      const status = result.error.type === 'auth' ? 401 : 502;
      return NextResponse.json(
        { error: result.error.message, pipelines: [] },
        { status }
      );
    }
    return NextResponse.json({
      pipelines: result.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        stages: p.stages ?? [],
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[CQ CRM pipelines]', msg);
    return NextResponse.json(
      { error: msg, pipelines: [] },
      { status: 500 }
    );
  }
}
