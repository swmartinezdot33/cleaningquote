import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET - List all organizations (super admin only) */
export async function GET() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createSupabaseServer();
  const { data: orgs, error } = await admin
    .from('organizations')
    .select('*')
    .order('name');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ orgs: orgs ?? [] });
}
