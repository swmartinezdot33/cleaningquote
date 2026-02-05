import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getTrackingCodes, setTrackingCodes } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const data = await getTrackingCodes(auth.tool.id);
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
    const trackingCodes: { customHeadCode?: string; trackingQuoteSummary?: string; trackingAppointmentBooking?: string } = {};
    if (typeof body.customHeadCode === 'string' && body.customHeadCode.trim()) trackingCodes.customHeadCode = body.customHeadCode.trim();
    if (typeof body.trackingQuoteSummary === 'string' && body.trackingQuoteSummary.trim()) trackingCodes.trackingQuoteSummary = body.trackingQuoteSummary.trim();
    if (typeof body.trackingAppointmentBooking === 'string' && body.trackingAppointmentBooking.trim()) trackingCodes.trackingAppointmentBooking = body.trackingAppointmentBooking.trim();

    await setTrackingCodes(trackingCodes, auth.tool.id);
    return NextResponse.json({ success: true, message: 'Tracking codes saved' });
  } catch (e) {
    console.error('POST dashboard tracking-codes:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to save' },
      { status: 500 }
    );
  }
}
