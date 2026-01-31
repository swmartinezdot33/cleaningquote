import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** GET - Fetch invite details by token (public, for accept page). Includes session status for UX. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const supabase = createSupabaseServer();
  const { data: invRaw, error } = await supabase
    .from('invitations')
    .select('id, org_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .single();

  if (error || !invRaw) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }
  const inv = invRaw as { id: string; org_id: string; email: string; role: string; expires_at: string; accepted_at: string | null };
  if (inv.accepted_at) {
    return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 });
  }
  if (new Date(inv.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invitation expired' }, { status: 400 });
  }

  const { data: orgRaw } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', inv.org_id)
    .single();
  const org = orgRaw as { name: string } | null;

  const invitedEmail = inv.email.toLowerCase().trim();
  let authenticated = false;
  let emailMatches = false;
  try {
    const { createSupabaseServerSSR } = await import('@/lib/supabase/server-ssr');
    const ssr = await createSupabaseServerSSR();
    const { data: { user } } = await ssr.auth.getUser();
    if (user?.email) {
      authenticated = true;
      emailMatches = (user.email.toLowerCase().trim() === invitedEmail);
    }
  } catch {
    // ignore session errors
  }

  return NextResponse.json({
    orgName: org?.name ?? 'Unknown',
    email: inv.email,
    role: inv.role,
    authenticated,
    emailMatches,
  });
}

/** POST - Accept invitation (must be logged in) */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const { createSupabaseServerSSR } = await import('@/lib/supabase/server-ssr');
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Please log in to accept' }, { status: 401 });
  }

  const admin = (await import('@/lib/supabase/server')).createSupabaseServer();
  const { data: invRaw2, error: invErr } = await admin
    .from('invitations')
    .select('id, org_id, email, role, accepted_at')
    .eq('token', token)
    .single();

  if (invErr || !invRaw2) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }
  const inv2 = invRaw2 as { id: string; org_id: string; email: string; role: string; accepted_at: string | null };
  if (inv2.accepted_at) {
    return NextResponse.json({ error: 'Already accepted' }, { status: 400 });
  }

  const invitedEmail = inv2.email.toLowerCase().trim();
  const userEmail = (user.email ?? '').toLowerCase().trim();
  if (userEmail !== invitedEmail) {
    return NextResponse.json(
      { error: `Please sign in with ${inv2.email} to accept this invitation` },
      { status: 403 }
    );
  }

  const { error: memberErr } = await admin.from('organization_members').insert({
    org_id: inv2.org_id,
    user_id: user.id,
    role: inv2.role as 'member' | 'admin',
  } as any).select().single();

  if (memberErr) {
    if (memberErr.code === '23505') {
      // @ts-expect-error Supabase types for invitations
      await admin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', inv2.id);
      return NextResponse.json({ success: true, alreadyMember: true });
    }
    return NextResponse.json({ error: memberErr.message }, { status: 400 });
  }

  // @ts-expect-error Supabase types for invitations
  await admin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', inv2.id);

  return NextResponse.json({ success: true });
}
