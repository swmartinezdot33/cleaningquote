import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { slugToSafe } from '@/lib/supabase/tools';

export const dynamic = 'force-dynamic';

/** GET - List organizations the user belongs to */
export async function GET() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: dataRaw } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', user.id);
  const data = (dataRaw ?? []) as Array<{ org_id: string; role: string }>;
  if (!data.length) {
    return NextResponse.json({ orgs: [] });
  }

  const orgIds = data.map((r) => r.org_id);
  const { data: orgsRaw } = await supabase
    .from('organizations')
    .select('*')
    .in('id', orgIds)
    .order('name');
  const orgs = (orgsRaw ?? []) as Array<{ id: string; name: string; slug: string }>;
  const roleByOrg = new Map(data.map((r) => [r.org_id, r.role]));

  const withRole = orgs.map((o) => ({
    ...o,
    role: roleByOrg.get(o.id) ?? 'member',
  }));

  return NextResponse.json({ orgs: withRole });
}

/** POST - Create a new organization */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  let slug = typeof body.slug === 'string' ? slugToSafe(body.slug) : slugToSafe(name);
  if (!slug) slug = 'org-' + Date.now().toString(36);

  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) {
    slug = slug + '-' + Date.now().toString(36).slice(-6);
  }

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name, slug } as any)
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? 'Failed to create org' }, { status: 400 });
  }

  const orgTyped = org as { id: string; name: string; slug: string };
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({ org_id: orgTyped.id, user_id: user.id, role: 'owner' } as any);

  if (memberError) {
    await supabase.from('organizations').delete().eq('id', orgTyped.id);
    return NextResponse.json({ error: 'Failed to add you as owner' }, { status: 500 });
  }

  return NextResponse.json({ org: { ...orgTyped, role: 'owner' } });
}
