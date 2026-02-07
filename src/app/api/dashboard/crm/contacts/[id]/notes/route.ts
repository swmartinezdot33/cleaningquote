import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getOrgsForDashboard } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** POST /api/dashboard/crm/contacts/[id]/notes */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const body = await request.json();
    const content = body.content?.trim();
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
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
