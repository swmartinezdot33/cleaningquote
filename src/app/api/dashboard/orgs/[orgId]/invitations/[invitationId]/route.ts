import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { canManageOrg } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** DELETE - Cancel a pending invitation (org admin or super admin only) */
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

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins or super admins can cancel invites' }, { status: 403 });
  }

  const admin = createSupabaseServer();

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
