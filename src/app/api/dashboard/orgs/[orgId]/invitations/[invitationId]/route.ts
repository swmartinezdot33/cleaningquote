import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** DELETE - Cancel a pending invitation (admin only) */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string; invitationId: string }> }
) {
  const { orgId, invitationId } = await params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseServer();
  const { data: memberRaw } = await admin
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single();
  const member = memberRaw as { role: string } | null;

  if (!member || member.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can cancel invites' }, { status: 403 });
  }

  const { error } = await admin
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('org_id', orgId)
    .is('accepted_at', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
