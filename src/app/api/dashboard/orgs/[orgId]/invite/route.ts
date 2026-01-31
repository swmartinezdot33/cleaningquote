import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

/** POST - Invite user by email to join org */
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

  const admin = createSupabaseServer();
  const { data: memberRaw } = await admin
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single();
  const member = memberRaw as { role: string } | null;

  if (!member || !['owner', 'admin'].includes(member.role)) {
    return NextResponse.json({ error: 'Only owners and admins can invite' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const role = (body.role ?? 'member') as 'member' | 'admin';
  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/invite/${token}`;

  return NextResponse.json({
    invitation: inv,
    inviteUrl,
    message: `Invite created. Share this link: ${inviteUrl}`,
  });
}
