import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { canManageOrg } from '@/lib/org-auth';
import * as configStore from '@/lib/config/store';
import { getSession } from '@/lib/ghl/session';

export const dynamic = 'force-dynamic';

function locationIdFromRequest(request: NextRequest): string | null {
  const header = request.headers.get('x-ghl-location-id')?.trim() || null;
  const query = request.nextUrl.searchParams.get('locationId')?.trim() || null;
  return header ?? query ?? null;
}

async function canAccessOrgViaGHLLocation(orgId: string, locationId: string): Promise<boolean> {
  const orgIds = await configStore.getOrgIdsByGHLLocationId(locationId);
  return orgIds.includes(orgId);
}

/** GET - List tools for this org (id, name). Auth: Supabase user or GHL iframe (locationId from request). */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  let allowed = false;
  let client: ReturnType<typeof createSupabaseServerSSR> | ReturnType<typeof createSupabaseServer> = supabase;
  const requestLocationId = locationIdFromRequest(request);
  if (user) {
    allowed = await canManageOrg(user.id, user.email ?? undefined, orgId);
  } else {
    const locationId = requestLocationId ?? (await getSession())?.locationId ?? null;
    if (locationId) {
      allowed = await canAccessOrgViaGHLLocation(orgId, locationId);
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
