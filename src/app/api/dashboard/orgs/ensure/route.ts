import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { slugToSafe } from '@/lib/supabase/tools';

export const dynamic = 'force-dynamic';

/**
 * POST - Ensure user has at least one org.
 * If none, creates a "Personal" org and adds user as owner.
 * Returns the orgs list.
 */
export async function POST() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membershipsRaw } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id);
  const memberships = (membershipsRaw ?? []) as Array<{ org_id: string; role: string }>;

  if (memberships.length > 0) {
    const orgIds = memberships.map((m) => m.org_id);
    const { data: orgsRaw } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)
      .order('name');
    const orgs = (orgsRaw ?? []) as Array<{ id: string; name: string; slug: string }>;
    const roleByOrg = new Map(memberships.map((m) => [m.org_id, m.role]));
    return NextResponse.json({
      orgs: orgs.map((o) => ({ ...o, role: roleByOrg.get(o.id) ?? 'member' })),
    });
  }

  const emailPart = (user.email ?? 'user').split('@')[0];
  let slug = slugToSafe(emailPart) || 'personal';
  slug = slug + '-' + Date.now().toString(36).slice(-6);

  const { data: orgRaw, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: 'Personal', slug } as any)
    .select()
    .single();

  if (orgErr || !orgRaw) {
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }

  const org = orgRaw as { id: string; name: string; slug: string };
  const { error: memberErr } = await supabase
    .from('organization_members')
    .insert({ org_id: org.id, user_id: user.id, role: 'owner' } as any);

  if (memberErr) {
    return NextResponse.json({ error: 'Failed to add you as owner' }, { status: 500 });
  }

  return NextResponse.json({
    orgs: [{ ...org, role: 'admin' }],
  });
}
