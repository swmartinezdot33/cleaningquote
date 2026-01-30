import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getServiceAreaPolygon, getServiceAreaNetworkLink } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const toolId = auth.tool.id;
  try {
    const networkLink = await getServiceAreaNetworkLink(toolId);
    if (networkLink) {
      const polygon = await getServiceAreaPolygon(toolId);
      return NextResponse.json({
        type: 'network',
        networkLink,
        polygonCount: polygon?.length ?? 0,
      });
    }
    const polygon = await getServiceAreaPolygon(toolId);
    if (polygon && polygon.length > 0) {
      return NextResponse.json({ type: 'direct', polygonCount: polygon.length });
    }
    return NextResponse.json({ type: 'none', polygonCount: 0 });
  } catch (e) {
    console.error('GET dashboard service-area status:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get service area status' },
      { status: 500 }
    );
  }
}
