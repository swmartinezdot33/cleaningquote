import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import { getOrgsForDashboard } from '@/lib/org-auth';
import { getSession } from '@/lib/ghl/session';
import * as configStore from '@/lib/config/store';

export const dynamic = 'force-dynamic';

/** GET - Return the currently selected org. When request has locationId (GHL iframe), always resolve org from organizations.ghl_location_id so each location sees only its org. Otherwise use Supabase user + cookie. */
export async function GET(request: NextRequest) {
  const headerLocationId = request.headers.get('x-ghl-location-id')?.trim() || null;
  const queryLocationId = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  const requestLocationId = headerLocationId ?? queryLocationId;

  // When locationId is present (GHL iframe), always resolve org from location — never use cookie/user so each account sees only its data.
  if (requestLocationId && isSupabaseConfigured()) {
    const locationId = requestLocationId;
    const orgIdsFromLocation = await configStore.getOrgIdsByGHLLocationId(locationId);
    let orgId: string | null = orgIdsFromLocation[0] ?? null;
    if (!orgId) orgId = await configStore.ensureOrgForGHLLocation(locationId);
    if (orgId) {
      const admin = createSupabaseServer();
      const { data: orgRow } = await admin
        .from('organizations')
        .select('id, name, slug, contact_email, contact_phone, office_address')
        .eq('id', orgId)
        .maybeSingle();
      if (orgRow) {
        const row = orgRow as { id: string; name: string; slug: string; contact_email?: string | null; contact_phone?: string | null; office_address?: string | null };
        return NextResponse.json({ org: { ...row, role: 'admin' as const } });
      }
    }
    return NextResponse.json({ org: null });
  }

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

  // No locationId in request and no user: try session location as fallback (e.g. server-side only).
  const ghlSession = await getSession();
  const locationId = ghlSession?.locationId ?? null;
  if (!locationId || !isSupabaseConfigured()) {
    return NextResponse.json({ org: null });
  }
  const orgIdsFromLocation = await configStore.getOrgIdsByGHLLocationId(locationId);
  let orgId: string | null = orgIdsFromLocation[0] ?? null;
  if (!orgId) {
    orgId = await configStore.ensureOrgForGHLLocation(locationId);
  }
  if (!orgId) return NextResponse.json({ org: null });
  const admin = createSupabaseServer();
  const { data: orgRow } = await admin
    .from('organizations')
    .select('id, name, slug, contact_email, contact_phone, office_address')
    .eq('id', orgId)
    .maybeSingle();
  if (!orgRow) return NextResponse.json({ org: null });
  const row = orgRow as { id: string; name: string; slug: string; contact_email?: string | null; contact_phone?: string | null; office_address?: string | null };
  const org = { ...row, role: 'admin' as const };
  return NextResponse.json({ org });
}
