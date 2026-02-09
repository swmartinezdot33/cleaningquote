import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { canManageOrg } from '@/lib/org-auth';
import * as configStore from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';

export const dynamic = 'force-dynamic';

async function canAccessOrgViaGHLLocation(orgId: string, locationId: string): Promise<boolean> {
  const orgIds = await configStore.getOrgIdsByGHLLocationId(locationId);
  return orgIds.includes(orgId);
}

/** GET - List tools for this org (id, name). For dropdowns and copy-from-tool. */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  let allowed = false;
  let client: ReturnType<typeof createSupabaseServerSSR> | ReturnType<typeof createSupabaseServer> = supabase;
  if (user) {
    allowed = await canManageOrg(user.id, user.email ?? undefined, orgId);
  } else {
    const ghlSession = await getSession();
    if (ghlSession?.locationId) {
      allowed = await canAccessOrgViaGHLLocation(orgId, ghlSession.locationId);
      if (allowed) client = createSupabaseServer();
    }
  }
  if (!allowed) {
    return NextResponse.json(
      user ? { error: 'Only org admins can list tools' } : { error: 'Unauthorized' },
      { status: user ? 403 : 401 }
    );
  }

  const { data, error } = await client
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
