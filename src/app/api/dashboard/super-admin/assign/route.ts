import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';
import type { OrgRole } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

/** POST - Assign user to org (super admin only) */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userId = body.user_id;
  const orgId = body.org_id;
  const role = (body.role ?? 'member') as OrgRole;

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'user_id and org_id required' }, { status: 400 });
  }

  const admin = createSupabaseServer();
  const { error } = await admin.from('organization_members').upsert(
    { org_id: orgId, user_id: userId, role } as any,
    { onConflict: 'org_id,user_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}

/** DELETE - Remove user from org (super admin only) */
export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  const orgId = searchParams.get('org_id');

  if (!userId || !orgId) {
    return NextResponse.json({ error: 'user_id and org_id required' }, { status: 400 });
  }

  const admin = createSupabaseServer();
  const { error } = await admin
    .from('organization_members')
    .delete()
    .eq('org_id', orgId)
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
