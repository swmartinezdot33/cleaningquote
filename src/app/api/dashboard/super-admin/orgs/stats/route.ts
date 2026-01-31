import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET - Org stats (member count, tool count) for super admin */
export async function GET() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createSupabaseServer();
  const { data: members } = await admin
    .from('organization_members')
    .select('org_id');
  const { data: tools } = await admin.from('tools').select('org_id');

  const memberCount: Record<string, number> = {};
  const toolCount: Record<string, number> = {};
  for (const m of members ?? []) {
    memberCount[(m as { org_id: string }).org_id] = (memberCount[(m as { org_id: string }).org_id] ?? 0) + 1;
  }
  for (const t of tools ?? []) {
    toolCount[(t as { org_id: string }).org_id] = (toolCount[(t as { org_id: string }).org_id] ?? 0) + 1;
  }

  return NextResponse.json({ memberCount, toolCount });
}
