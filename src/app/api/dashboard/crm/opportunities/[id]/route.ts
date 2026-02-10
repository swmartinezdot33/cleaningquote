import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { updateGHLOpportunity } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/dashboard/crm/opportunities/[id]
 * Body: { name?: string; monetaryValue?: number; status?: string; pipelineStageId?: string }
 * Updates the opportunity in GHL. At least one field required. Uses OAuth location token.
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

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      monetaryValue?: number;
      status?: string;
      pipelineStageId?: string;
    };
    const payload: { name?: string; monetaryValue?: number; status?: string; pipelineStageId?: string } = {};
    if (typeof body.name === 'string') payload.name = body.name;
    if (typeof body.monetaryValue === 'number') payload.monetaryValue = body.monetaryValue;
    if (typeof body.status === 'string') payload.status = body.status;
    if (typeof body.pipelineStageId === 'string') payload.pipelineStageId = body.pipelineStageId;
    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { error: 'At least one of name, monetaryValue, status, pipelineStageId is required' },
        { status: 400 }
      );
    }

    const opportunity = await updateGHLOpportunity(
      id,
      payload,
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
