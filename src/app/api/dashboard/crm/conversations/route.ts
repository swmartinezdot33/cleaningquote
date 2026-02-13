import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { searchConversations } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/crm/conversations
 * List conversations for the location (for Inbox middle column).
 * Query: limit, status, contactId (optional), query (optional search string)
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    if ('needsConnect' in ctx) return NextResponse.json({ error: 'Connect your location first' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const status = searchParams.get('status')?.trim() || 'all';
    const contactId = searchParams.get('contactId')?.trim() || undefined;
    const query = searchParams.get('query')?.trim() || undefined;
    const sortBy = status === 'recents' ? 'last_manual_message_date' : 'last_message_date';

    const credentials = { token: ctx.token, locationId: ctx.locationId };
    const { conversations, total } = await searchConversations(
      ctx.locationId,
      { limit, status, contactId, query, sortBy, sort: 'desc' },
      credentials
    );

    return NextResponse.json({ conversations, total: total ?? conversations.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('scope')) {
      return NextResponse.json(
        { error: 'Conversations require conversation permissions. Reconnect your location in GHL with the correct scopes.' },
        { status: 403 }
      );
    }
    console.error('CRM conversations list error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
