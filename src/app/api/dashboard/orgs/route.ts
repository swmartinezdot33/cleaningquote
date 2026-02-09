import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { slugToSafe } from '@/lib/supabase/tools';
import * as configStore from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';

export const dynamic = 'force-dynamic';

function locationIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  return header ?? query ?? null;
}

/** GET - List organizations. Supabase user: orgs they belong to. GHL iframe: orgs linked to locationId (from request). */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: dataRaw } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id);
    const data = (dataRaw ?? []) as Array<{ org_id: string; role: string }>;
    if (!data.length) return NextResponse.json({ orgs: [] });
    const orgIds = data.map((r) => r.org_id);
    const { data: orgsRaw } = await supabase.from('organizations').select('*').in('id', orgIds).order('name');
    const orgs = (orgsRaw ?? []) as Array<{ id: string; name: string; slug: string }>;
    const roleByOrg = new Map(data.map((r) => [r.org_id, r.role]));
    return NextResponse.json({ orgs: orgs.map((o) => ({ ...o, role: roleByOrg.get(o.id) ?? 'member' })) });
  }

  const requestLocationId = locationIdFromRequest(request);
  const locationId = requestLocationId ?? (await getSession())?.locationId ?? null;
  if (!locationId) return NextResponse.json({ orgs: [] });

  const orgIds = await configStore.getOrgIdsByGHLLocationId(locationId);
  if (orgIds.length === 0) return NextResponse.json({ orgs: [] });

  const admin = createSupabaseServer();
  const { data: orgsRaw } = await admin.from('organizations').select('*').in('id', orgIds).order('name');
  const orgs = (orgsRaw ?? []) as Array<{ id: string; name: string; slug: string }>;
  return NextResponse.json({ orgs: orgs.map((o) => ({ ...o, role: 'admin' as const })) });
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

  // Use service role for inserts - user is authenticated; avoids RLS blocking org/org_members creation
  const admin = createSupabaseServer();
  const { data: existing } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) {
    slug = slug + '-' + Date.now().toString(36).slice(-6);
  }

  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({ name, slug } as any)
    .select()
    .single();

  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? 'Failed to create org' }, { status: 400 });
  }

  const orgTyped = org as { id: string; name: string; slug: string };
  const { error: memberError } = await admin
    .from('organization_members')
    .insert({ org_id: orgTyped.id, user_id: user.id, role: 'admin' } as any);

  if (memberError) {
    await admin.from('organizations').delete().eq('id', orgTyped.id);
    return NextResponse.json({ error: 'Failed to add you as admin' }, { status: 500 });
  }

  return NextResponse.json({ org: { ...orgTyped, role: 'admin' } });
}
