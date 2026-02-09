import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import { getOrgsForDashboard } from '@/lib/org-auth';
import { getSession } from '@/lib/ghl/session';
import * as configStore from '@/lib/config/store';

export const dynamic = 'force-dynamic';

/** GET - Return the currently selected org (from cookie, from GHL location, or default). For GHL iframe, pass locationId (query or x-ghl-location-id) so org resolves for the current location. */
export async function GET(request: NextRequest) {
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

  // GHL-only: one org = one GHL sub-account (location). Resolve org from locationId; auto-provision if none.
  const ghlSession = await getSession();
  const headerLocationId = request.headers.get('x-ghl-location-id')?.trim() || null;
  const queryLocationId = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  const locationId = headerLocationId ?? queryLocationId ?? ghlSession?.locationId ?? null;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'orgs/selected/route.ts:GET', message: 'GHL branch entry', data: { hasLocationId: !!locationId, locationIdPreview: locationId ? `${locationId.slice(0, 8)}..` : null }, timestamp: Date.now(), hypothesisId: 'H1-H3' }) }).catch(() => {});
  // #endregion
  if (!locationId || !isSupabaseConfigured()) {
    return NextResponse.json({ org: null });
  }
  const orgIdsFromLocation = await configStore.getOrgIdsByGHLLocationId(locationId);
  let orgId: string | null = orgIdsFromLocation[0] ?? null;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'orgs/selected/route.ts:getOrgIds', message: 'orgIds for location', data: { orgIdsLength: orgIdsFromLocation.length, firstOrgId: orgId ?? null }, timestamp: Date.now(), hypothesisId: 'H1-H3' }) }).catch(() => {});
  // #endregion
  if (!orgId) {
    orgId = await configStore.ensureOrgForGHLLocation(locationId);
  }
  if (!orgId) return NextResponse.json({ org: null });
  const admin = createSupabaseServer();
  const { data: orgRow } = await admin
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .maybeSingle();
  if (!orgRow) return NextResponse.json({ org: null });
  const row = orgRow as { id: string; name: string; slug: string };
  const org = { ...row, role: 'admin' as const };
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'orgs/selected/route.ts:return', message: 'returning org', data: { orgId: org.id, locationIdPreview: locationId.slice(0, 8) }, timestamp: Date.now(), hypothesisId: 'H1-H3' }) }).catch(() => {});
  // #endregion
  return NextResponse.json({ org });
}
