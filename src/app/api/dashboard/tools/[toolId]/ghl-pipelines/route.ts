import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ toolId: string }> }
) {
  const auth = await getDashboardUserAndTool((await ctx.params).toolId);
  if (auth instanceof NextResponse) return auth;

  const toolId = auth.tool.id;
  try {
    const token = await getGHLToken(toolId);
    if (!token) {
      return NextResponse.json({ error: 'HighLevel token not configured' }, { status: 400 });
    }
    const locationId = await getGHLLocationId(toolId);
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required. Configure it in Settings.' }, { status: 400 });
    }

    const res = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Version: '2021-07-28',
        },
      }
    );

    if (!res.ok) {
      const err: { message?: string; error?: string; msg?: string } = await res.json().catch(() => ({}));
      const msg = err.message ?? err.error ?? err.msg ?? res.statusText;
      return NextResponse.json(
        { error: 'Failed to fetch pipelines', details: msg },
        { status: res.status }
      );
    }

    const data = await res.json();
    const pipelines = data.pipelines ?? data.data ?? [];
    return NextResponse.json({
      success: true,
      locationId,
      pipelines: pipelines.map((p: { id: string; name: string; stages?: Array<{ id: string; name: string }> }) => ({
        id: p.id,
        name: p.name,
        stages: (p.stages ?? []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })),
      })),
    });
  } catch (e) {
    console.error('GET dashboard ghl-pipelines:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch pipelines' },
      { status: 500 }
    );
  }
}
