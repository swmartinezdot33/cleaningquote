import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { sendConversationMessage } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dashboard/crm/contacts/[id]/messages
 * Send an SMS or Email to the contact.
 * Body: { type: 'SMS' | 'Email', message: string, subject?: string } (subject required for Email)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    if (!contactId) return NextResponse.json({ error: 'Contact ID required' }, { status: 400 });

    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    if ('needsConnect' in ctx) return NextResponse.json({ error: 'Connect your location first' }, { status: 400 });

    const body = await request.json();
    const type = body?.type === 'Email' ? 'Email' : body?.type === 'SMS' ? 'SMS' : null;
    if (!type) return NextResponse.json({ error: 'type must be SMS or Email' }, { status: 400 });

    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    if (!message) return NextResponse.json({ error: 'message is required' }, { status: 400 });

    if (type === 'Email' && typeof body?.subject !== 'string') {
      return NextResponse.json({ error: 'subject is required for Email' }, { status: 400 });
    }

    const credentials = { token: ctx.token, locationId: ctx.locationId };
    const payload: { type: 'SMS' | 'Email'; contactId: string; message: string; subject?: string; html?: string } = {
      type,
      contactId,
      message,
    };
    if (type === 'Email') payload.subject = String(body.subject ?? '').trim();
    if (typeof body?.html === 'string') payload.html = body.html;

    const result = await sendConversationMessage(payload, credentials);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('scope')) {
      return NextResponse.json(
        { error: 'Sending messages requires conversation permissions. Reconnect your location in GHL with the correct scopes.' },
        { status: 403 }
      );
    }
    console.error('CRM send message error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
