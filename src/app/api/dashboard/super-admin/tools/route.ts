import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET - List all tools with org name (super admin only). For quote reassignment etc. */
export async function GET() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createSupabaseServer();
  const { data: tools, error: toolsErr } = await admin
    .from('tools')
    .select('id, name, slug, org_id')
    .order('name');
  if (toolsErr || !tools?.length) {
    return NextResponse.json({ tools: [] });
  }

  const orgIds = [...new Set((tools as { org_id: string }[]).map((t) => t.org_id))];
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name')
    .in('id', orgIds);
  const orgByName = new Map((orgs ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));

  const withOrg = (tools as { id: string; name: string; slug: string; org_id: string }[]).map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    org_id: t.org_id,
    org_name: orgByName.get(t.org_id) ?? 'Unknown',
  }));

  return NextResponse.json({ tools: withOrg });
}
