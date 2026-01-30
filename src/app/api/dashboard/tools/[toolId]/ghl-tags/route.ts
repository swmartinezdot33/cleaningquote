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
      return NextResponse.json({ error: 'GHL token not configured', tags: [] }, { status: 400 });
    }
    const locationId = await getGHLLocationId(toolId);
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID not configured', tags: [] }, { status: 400 });
    }

    const res = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/tags`,
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
      if (res.status === 404) {
        return NextResponse.json({ tags: [], message: 'No tags found' });
      }
      return NextResponse.json(
        { error: `Failed to fetch tags: ${res.status}`, tags: [] },
        { status: res.status }
      );
    }

    const data = await res.json();
    const raw = data.tags ?? data.data ?? (Array.isArray(data) ? data : []);
    const tags = (Array.isArray(raw) ? raw : []).map((tag: { id?: string; name?: string }) => ({
      id: tag.id ?? tag.name,
      name: tag.name ?? '',
    }));
    return NextResponse.json({ tags });
  } catch (e) {
    console.error('GET dashboard ghl-tags:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch tags', tags: [] },
      { status: 500 }
    );
  }
}
