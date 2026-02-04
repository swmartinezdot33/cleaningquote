import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { canManageOrg } from '@/lib/org-auth';
import { getSiteUrl } from '@/lib/canonical-url';

export const dynamic = 'force-dynamic';

/** POST - Resend invite email for a pending invitation (org admin or super admin only) */
export async function POST(
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
    return NextResponse.json({ error: 'Only org admins or super admins can resend invites' }, { status: 403 });
  }

  const admin = createSupabaseServer();

  const { data: invRaw, error: fetchError } = await admin
    .from('invitations')
    .select('id, email, token, expires_at')
    .eq('id', invitationId)
    .eq('org_id', orgId)
    .is('accepted_at', null)
    .maybeSingle();

  const inv = invRaw as { id: string; email: string; token: string; expires_at: string } | null;
  if (fetchError || !inv?.token || !inv?.email) {
    return NextResponse.json({ error: 'Invitation not found or already accepted' }, { status: 404 });
  }

  const baseUrl = getSiteUrl().replace(/\/$/, '');
  const inviteUrl = `${baseUrl}/invite/${inv.token}`;

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(inv.email, {
    redirectTo: inviteUrl,
    data: { invite_token: inv.token },
  });

  if (inviteError) {
    return NextResponse.json({
      emailSent: false,
      message: `Could not send email: ${inviteError.message}. You can share the invite link manually.`,
      inviteUrl,
    });
  }

  return NextResponse.json({
    emailSent: true,
    message: `Invite email resent to ${inv.email}.`,
  });
}

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
