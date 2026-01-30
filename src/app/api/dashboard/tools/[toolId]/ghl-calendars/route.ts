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
      return NextResponse.json({ error: 'GHL token not configured', calendars: [] }, { status: 400 });
    }
    const locationId = await getGHLLocationId(toolId);
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID not configured', calendars: [] }, { status: 400 });
    }

    const res = await fetch(
      `https://services.leadconnectorhq.com/calendars/?locationId=${locationId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Version: '2021-04-15',
        },
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ calendars: [], message: 'No calendars found' });
      }
      return NextResponse.json(
        { error: `Failed to fetch calendars: ${res.status}`, calendars: [] },
        { status: res.status }
      );
    }

    const data = await res.json();
    const raw = data.calendars ?? data.data ?? (Array.isArray(data) ? data : []);
    const calendars = (Array.isArray(raw) ? raw : []).map((cal: { id: string; name?: string }) => ({
      id: cal.id,
      name: cal.name ?? `Calendar ${(cal.id || '').substring(0, 8)}`,
    }));
    return NextResponse.json({ calendars });
  } catch (e) {
    console.error('GET dashboard ghl-calendars:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch calendars', calendars: [] },
      { status: 500 }
    );
  }
}
