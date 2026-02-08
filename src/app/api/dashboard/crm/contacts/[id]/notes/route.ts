import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { createNote } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/** POST /api/dashboard/crm/contacts/[id]/notes */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    if ('needsConnect' in ctx) return NextResponse.json({ error: 'Connect your location first' }, { status: 400 });

    const note = await createNote(
      { contactId: id, body: content },
      ctx.locationId,
      ctx.token
    );
    return NextResponse.json({ note: { id: note.id, content: note.body, created_at: note.createdAt } });
  } catch (err) {
    console.error('CRM note create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add note' },
      { status: 500 }
    );
  }
}
