import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { searchConversations } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/crm/contacts/[id]/conversations
 * List conversations for a single contact.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Contact ID required' }, { status: 400 });

    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    if ('needsConnect' in ctx) return NextResponse.json({ error: 'Connect your location first' }, { status: 400 });

    const credentials = { token: ctx.token, locationId: ctx.locationId };
    const { conversations, total } = await searchConversations(
      ctx.locationId,
      { contactId: id, limit: 50 },
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
    console.error('CRM contact conversations error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
