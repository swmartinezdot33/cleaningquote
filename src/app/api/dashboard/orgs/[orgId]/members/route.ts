import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** GET - List org members and pending invites */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseServer();
  const { data: membersRaw } = await admin
    .from('organization_members')
    .select('user_id, role, created_at')
    .eq('org_id', orgId);
  const members = (membersRaw ?? []) as Array<{ user_id: string; role: string }>;

  const { data: invites } = await admin
    .from('invitations')
    .select('id, email, role, expires_at, accepted_at')
    .eq('org_id', orgId)
    .is('accepted_at', null);

  const userIds = [...new Set(members.map((m) => m.user_id))];
  const users: Record<string, { email: string | null }> = {};
  if (userIds.length > 0) {
    const { data: authUsers } = await admin.auth.admin.listUsers({ perPage: 500 });
    for (const u of authUsers?.users ?? []) {
      users[u.id] = { email: u.email ?? null };
    }
  }

  const membersWithEmail = members.map((m) => ({
    ...m,
    email: users[m.user_id]?.email ?? null,
  }));

  return NextResponse.json({
    members: membersWithEmail,
    invitations: invites ?? [],
  });
}
