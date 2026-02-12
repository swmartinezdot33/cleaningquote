import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { getConversationMessages } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/inbox/conversations/[conversationId]/messages - thread messages */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) {
      return NextResponse.json({ messages: [], locationIdRequired: true });
    }
    if ('needsConnect' in ctx) {
      return NextResponse.json({ messages: [], needsConnect: true });
    }

    const { conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ messages: [], error: 'conversationId required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10) || 50));
    const lastMessageId = searchParams.get('lastMessageId') || undefined;

    const credentials = { token: ctx.token, locationId: ctx.locationId };
    const { messages } = await getConversationMessages(
      conversationId,
      { limit, lastMessageId },
      credentials
    );

    return NextResponse.json({ messages });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[CQ Inbox messages] error', { err: msg });
    return NextResponse.json(
      { messages: [], error: msg },
      { status: 502 }
    );
  }
}
