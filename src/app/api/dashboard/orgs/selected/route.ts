import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET - Return the currently selected org (from cookie or default) */
export async function GET() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
  const cookieStore = await cookies();
  const selectedId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;
  const org = orgs.find((o) => o.id === selectedId) ?? orgs[0] ?? null;

  if (!org) {
    return NextResponse.json({ org: null });
  }
  return NextResponse.json({ org });
}
