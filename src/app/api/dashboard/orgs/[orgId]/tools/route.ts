import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET - List tools for this org (id, name). For dropdowns and copy-from-tool. */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can list tools' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('tools')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    tools: (data ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name })),
  });
}
