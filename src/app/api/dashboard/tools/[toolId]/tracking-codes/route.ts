import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getKV, toolKey } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'admin:tracking-codes';

interface TrackingCodes {
  customHeadCode?: string;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const kv = getKV();
    const data = await kv.get<TrackingCodes>(toolKey(auth.tool.id, KEY));
    return NextResponse.json({ trackingCodes: data ?? {} });
  } catch (e) {
    console.error('GET dashboard tracking-codes:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get tracking codes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const customHeadCode = body.customHeadCode;
    const trackingCodes: TrackingCodes = {};
    if (customHeadCode?.trim()) trackingCodes.customHeadCode = customHeadCode.trim();

    const kv = getKV();
    await kv.set(toolKey(auth.tool.id, KEY), trackingCodes);
    return NextResponse.json({ success: true, message: 'Tracking codes saved' });
  } catch (e) {
    console.error('POST dashboard tracking-codes:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save' },
      { status: 500 }
    );
  }
}
