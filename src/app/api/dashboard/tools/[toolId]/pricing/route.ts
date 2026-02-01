import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getPricingTable, setPricingTable, clearPricingData } from '@/lib/kv';
import { invalidatePricingCache } from '@/lib/pricing/loadPricingTable';
import type { PricingTable } from '@/lib/pricing/types';

export const dynamic = 'force-dynamic';

/** GET - Get pricing table for this tool */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const pricingData = await getPricingTable(toolId);

    if (!pricingData) {
      return NextResponse.json({
        exists: false,
        message: 'No pricing data found. Upload a file or add pricing manually.',
      });
    }

    return NextResponse.json({ exists: true, data: pricingData });
  } catch (err) {
    if (err instanceof Error && err.message.includes('KV')) {
      return NextResponse.json({
        exists: false,
        message: 'Storage not configured.',
      });
    }
    console.error('GET dashboard pricing:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get pricing' },
      { status: 500 }
    );
  }
}

/** POST - Save pricing table for this tool */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const pricingData: PricingTable = body.data;

    if (!pricingData || !pricingData.rows || !Array.isArray(pricingData.rows)) {
      return NextResponse.json({ error: 'Invalid pricing data structure' }, { status: 400 });
    }
    if (!pricingData.maxSqFt || typeof pricingData.maxSqFt !== 'number') {
      return NextResponse.json({ error: 'maxSqFt is required and must be a number' }, { status: 400 });
    }
    for (const row of pricingData.rows) {
      if (!row.sqFtRange || typeof row.sqFtRange.min !== 'number' || typeof row.sqFtRange.max !== 'number') {
        return NextResponse.json({ error: 'Each row must have a valid sqFtRange with min and max' }, { status: 400 });
      }
    }

    await setPricingTable(pricingData, toolId);
    invalidatePricingCache(toolId);

    return NextResponse.json({
      success: true,
      message: 'Pricing data saved',
      rowsCount: pricingData.rows.length,
      maxSqFt: pricingData.maxSqFt,
    });
  } catch (err) {
    console.error('POST dashboard pricing:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save pricing' },
      { status: 500 }
    );
  }
}

/** DELETE - Delete pricing data for this tool */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    await clearPricingData(toolId);
    invalidatePricingCache(toolId);
    return NextResponse.json({ success: true, message: 'Pricing data deleted' });
  } catch (err) {
    console.error('DELETE dashboard pricing:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete pricing' },
      { status: 500 }
    );
  }
}
