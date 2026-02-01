import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';
import { getSiteUrl } from '@/lib/canonical-url';
import { canManageOrg } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

function getBaseUrl(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env && env.startsWith('http')) return env.replace(/\/$/, '');
  try {
    const u = new URL(request.url);
    if (u.origin && u.origin !== 'http://localhost:3000') return u.origin;
  } catch {}
  return getSiteUrl();
}

/** Find Supabase auth user id by email (admin listUsers, paginated). */
async function findUserIdByEmail(admin: ReturnType<typeof createSupabaseServer>, email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 0;
  const perPage = 100;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users) return null;
    const found = data.users.find((u) => (u.email ?? '').toLowerCase() === normalized);
    if (found) return found.id;
    if (data.users.length < perPage) break;
    page++;
  }
  return null;
}

/** POST - Invite user by email to join org. If user exists, add them to org. Otherwise create invite and send email. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins or super admins can invite' }, { status: 403 });
  }

  const admin = createSupabaseServer();

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = (body.role ?? 'member') as 'member' | 'admin';
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const existingUserId = await findUserIdByEmail(admin, email);

  if (existingUserId) {
    const { data: existingMember } = await admin
      .from('organization_members')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', existingUserId)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({
        added: false,
        alreadyMember: true,
        message: `${email} is already a member of this organization.`,
      });
    }

    const { error: insertError } = await admin.from('organization_members').insert({
      org_id: orgId,
      user_id: existingUserId,
      role,
    } as any);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({
      added: true,
      existingUser: true,
      message: `Added ${email} to this organization. They already have an account and can switch to this org from the dashboard.`,
    });
  }

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: inv, error } = await admin.from('invitations').insert({
    org_id: orgId,
    email,
    role,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  } as any).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const baseUrl = getBaseUrl(request);
  const inviteUrl = `${baseUrl}/invite/${token}`;

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteUrl,
    data: { invite_token: token },
  });

  if (inviteError) {
    return NextResponse.json({
      invitation: inv,
      inviteUrl,
      emailSent: false,
      message: `Invite created. Could not send email (${inviteError.message}). Share this link manually:`,
    });
  }

  return NextResponse.json({
    invitation: inv,
    inviteUrl,
    emailSent: true,
    message: `Invite email sent to ${email}. They can sign up or sign in via the link in the email.`,
  });
}
