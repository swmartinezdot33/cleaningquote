import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import { getDashboardLocationAndOrg } from '@/lib/dashboard-location';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/context
 * Single endpoint to resolve current org from locationId (header or query).
 * Returns { org, orgId, locationId, orgs } for the dashboard context provider.
 * Client must send x-ghl-location-id and/or locationId query (useDashboardApi does this).
 */
export async function GET(request: NextRequest) {
  const resolved = await getDashboardLocationAndOrg(request);
  if (resolved instanceof NextResponse) return resolved;

  const { locationId, orgId, orgIds } = resolved;
  if (!orgId || !isSupabaseConfigured()) {
    return NextResponse.json({ org: null, orgId: null, locationId, orgs: [] });
  }

  const supabase = createSupabaseServer();
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', orgId)
    .maybeSingle();

  if (!orgRow) {
    return NextResponse.json({ org: null, orgId: null, locationId, orgs: [] });
  }

  const org = {
    ...(orgRow as { id: string; name: string; slug: string }),
    role: 'admin' as const,
  };
  const orgs = [org];

  return NextResponse.json({ org, orgId, locationId, orgs });
}
