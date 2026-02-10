import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { updateGHLOpportunity } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/dashboard/crm/opportunities/[id]
 * Body: { pipelineStageId?: string }
 * Updates the opportunity (e.g. move to another stage). Uses OAuth location token.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) {
      return NextResponse.json(
        { error: 'Location ID required' },
        { status: 400 }
      );
    }
    if ('needsConnect' in ctx) {
      return NextResponse.json(
        { error: 'Connect your location first', needsConnect: true },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Opportunity ID required' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { pipelineStageId } = body as { pipelineStageId?: string };
    if (!pipelineStageId || typeof pipelineStageId !== 'string') {
      return NextResponse.json(
        { error: 'pipelineStageId is required' },
        { status: 400 }
      );
    }

    const opportunity = await updateGHLOpportunity(
      id,
      { pipelineStageId },
      ctx.locationId,
      { token: ctx.token, locationId: ctx.locationId }
    );
    return NextResponse.json({ opportunity });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[CQ CRM opportunities PATCH]', msg);
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
