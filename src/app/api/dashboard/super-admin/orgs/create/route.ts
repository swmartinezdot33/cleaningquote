import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';
import { slugToSafe } from '@/lib/supabase/tools';

export const dynamic = 'force-dynamic';

/** POST - Create organization (super admin only) */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  let slug = typeof body.slug === 'string' ? slugToSafe(body.slug) : slugToSafe(name);
  if (!slug) slug = 'org-' + Date.now().toString(36);

  const admin = createSupabaseServer();
  const { data: existing } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) {
    slug = slug + '-' + Date.now().toString(36).slice(-6);
  }

  const { data: org, error } = await admin
    .from('organizations')
    .insert({ name, slug } as any)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const adminId = body.admin_id ?? body.owner_id ?? user.id;
  if (adminId) {
    await admin.from('organization_members').insert({
      org_id: (org as { id: string }).id,
      user_id: adminId,
      role: 'admin',
    } as any);
  }

  return NextResponse.json({ org });
}
