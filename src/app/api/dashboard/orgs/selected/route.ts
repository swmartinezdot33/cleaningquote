import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import { getOrgsForDashboard } from '@/lib/org-auth';
import { getSession } from '@/lib/ghl/session';
import * as configStore from '@/lib/config/store';

export const dynamic = 'force-dynamic';

/** GET - Return the currently selected org (from cookie, from GHL location, or default) */
export async function GET() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
    const cookieStore = await cookies();
    const selectedId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;
    const org = orgs.find((o) => o.id === selectedId) ?? orgs[0] ?? null;
    if (!org) return NextResponse.json({ org: null });
    return NextResponse.json({ org });
  }

  // GHL-only: resolve org from current GHL location (org_ghl_settings.ghl_location_id)
  const ghlSession = await getSession();
  if (!ghlSession?.locationId || !isSupabaseConfigured()) {
    return NextResponse.json({ org: null });
  }
  const orgIds = await configStore.getOrgIdsByGHLLocationId(ghlSession.locationId);
  if (orgIds.length === 0) {
    return NextResponse.json({ org: null });
  }
  const admin = createSupabaseServer();
  const { data: orgRow } = await admin
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgIds[0])
    .maybeSingle();
  if (!orgRow) return NextResponse.json({ org: null });
  const row = orgRow as { id: string; name: string; slug: string };
  const org = { ...row, role: 'admin' as const };
  return NextResponse.json({ org });
}
