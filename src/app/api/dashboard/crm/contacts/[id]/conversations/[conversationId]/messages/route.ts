import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { getConversationMessages } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/crm/contacts/[id]/conversations/[conversationId]/messages
 * Get messages for a conversation with pagination.
 * Query: limit (default 30), lastMessageId (for next page)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    if (!conversationId) return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });

    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    if ('needsConnect' in ctx) return NextResponse.json({ error: 'Connect your location first' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)));
    const lastMessageId = searchParams.get('lastMessageId')?.trim() || undefined;

    const credentials = { token: ctx.token, locationId: ctx.locationId };
    const result = await getConversationMessages(
      conversationId,
      { limit, lastMessageId, type: 'TYPE_SMS,TYPE_EMAIL' },
      credentials
    );

    return NextResponse.json({
      messages: result.messages,
      lastMessageId: result.lastMessageId,
      nextPage: result.nextPage ?? false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('scope')) {
      return NextResponse.json(
        { error: 'Conversations require conversation permissions. Reconnect your location in GHL with the correct scopes.' },
        { status: 403 }
      );
    }
    console.error('CRM conversation messages error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
