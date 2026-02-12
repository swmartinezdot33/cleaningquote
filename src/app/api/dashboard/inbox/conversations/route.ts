import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { searchConversations } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/inbox/conversations - list GHL conversations with optional search */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) {
      return NextResponse.json({ conversations: [], locationIdRequired: true });
    }
    if ('needsConnect' in ctx) {
      return NextResponse.json({ conversations: [], needsConnect: true });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50));
    const status = searchParams.get('status') || undefined;

    const credentials = { token: ctx.token, locationId: ctx.locationId };
    const { conversations } = await searchConversations(
      ctx.locationId,
      { query: search ?? undefined, limit, status },
      credentials
    );

    return NextResponse.json({ conversations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[CQ Inbox conversations] error', { err: msg });
    return NextResponse.json(
      { conversations: [], error: msg },
      { status: 502 }
    );
  }
}
