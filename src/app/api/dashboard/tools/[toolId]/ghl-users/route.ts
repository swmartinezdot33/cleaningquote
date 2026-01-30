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
      return NextResponse.json({ error: 'GHL token not configured' }, { status: 400 });
    }
    const locationId = await getGHLLocationId(toolId);
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID is required. Configure it in Settings.' }, { status: 400 });
    }

    const res = await fetch(
      `https://services.leadconnectorhq.com/users/?locationId=${locationId}`,
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
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { message?: string }).message ?? 'Failed to fetch users' },
        { status: res.status }
      );
    }

    const data = await res.json();
    const users = data.users ?? data ?? [];
    const formatted = Array.isArray(users)
      ? users.map((u: { id?: string; userId?: string; name?: string; firstName?: string; lastName?: string; email?: string }) => {
          const namePart = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
          const name = u.name ?? (namePart || (u.email ?? 'Unknown'));
          return {
            id: u.id ?? u.userId,
            name,
            email: u.email ?? '',
          };
        })
      : [];
    return NextResponse.json({ success: true, users: formatted });
  } catch (e) {
    console.error('GET dashboard ghl-users:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
