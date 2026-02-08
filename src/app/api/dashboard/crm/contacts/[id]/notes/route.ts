import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getOrgsForDashboard } from '@/lib/org-auth';
import { getSession } from '@/lib/ghl/session';
import { getGHLCredentials } from '@/lib/ghl/credentials';
import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';
import { getLocationIdFromRequest } from '@/lib/request-utils';
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

    // 1) GHL iframe flow — locationId from query or body, token from token-store
    const requestLocationId = getLocationIdFromRequest(request) || body.locationId;
    if (requestLocationId) {
      try {
        const token = await getOrFetchTokenForLocation(requestLocationId);
        if (token) {
          const note = await createNote(
            { contactId: id, body: content },
            requestLocationId,
            token
          );
          return NextResponse.json({ note: { id: note.id, content: note.body, created_at: note.createdAt } });
        }
      } catch (err) {
        console.warn('CRM note: GHL create error', err);
        return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
      }
      return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
    }

    // 2) Session (OAuth) flow
    const session = await getSession();
    if (session) {
      try {
        const credentials = await getGHLCredentials({ session });
        if (credentials.token && credentials.locationId) {
          const note = await createNote(
            { contactId: id, body: content },
            credentials.locationId,
            credentials.token
          );
          return NextResponse.json({ note: { id: note.id, content: note.body, created_at: note.createdAt } });
        }
      } catch (err) {
        console.warn('CRM note: session/GHL error', err);
      }
    }

    // 3) Supabase org flow
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
    const cookieStore = await cookies();
    const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;

    if (!selectedOrgId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', id)
      .eq('org_id', selectedOrgId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const admin = createSupabaseServer();
    const { data: note, error } = await (admin as any)
      .from('notes')
      .insert({
        contact_id: id,
        org_id: selectedOrgId,
        content,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await (admin as any).from('activities').insert({
      contact_id: id,
      org_id: selectedOrgId,
      type: 'note',
      title: 'Note added',
      metadata: { note_id: note.id },
      created_by: user.id,
    });

    return NextResponse.json({ note });
  } catch (err) {
    console.error('CRM note create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to add note' },
      { status: 500 }
    );
  }
}
