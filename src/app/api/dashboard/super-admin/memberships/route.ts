import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET - List org memberships (super admin only) */
export async function GET() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createSupabaseServer();
  const { data: members, error } = await admin
    .from('organization_members')
    .select('org_id, user_id, role');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: members ?? [] });
}
