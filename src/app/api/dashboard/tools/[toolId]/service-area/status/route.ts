import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getServiceAreaPolygon, getServiceAreaNetworkLink } from '@/lib/kv';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const toolId = auth.tool.id;
  try {
    if (isSupabaseConfigured()) {
      const supabase = createSupabaseServer();
      const { data: assignments } = await supabase
        .from('tool_service_areas')
        .select('service_area_id')
        .eq('tool_id', toolId);
      if (assignments?.length) {
        const ids = assignments.map((a: { service_area_id: string }) => a.service_area_id);
        const { data: areas } = await supabase
          .from('service_areas')
          .select('id, name')
          .in('id', ids);
        return NextResponse.json({
          type: 'assigned',
          assignedCount: ids.length,
          assignedAreas: (areas ?? []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })),
        });
      }
    }
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
