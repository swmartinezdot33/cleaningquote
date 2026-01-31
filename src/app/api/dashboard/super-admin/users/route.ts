import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET - List all users (super admin only) */
export async function GET() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createSupabaseServer();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 500 });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = (data?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
  }));

  return NextResponse.json({ users });
}
