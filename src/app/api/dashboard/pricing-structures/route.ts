import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getDashboardLocationAndOrg } from '@/lib/dashboard-location';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/pricing-structures - locationId from request/session → organizations.ghl_location_id → org → pricing structures. */
export async function GET(request: NextRequest) {
  const resolved = await getDashboardLocationAndOrg(request, { ensureOrg: true });
  if (resolved instanceof NextResponse) return resolved;
  const { orgId } = resolved;
  if (!orgId) {
    return NextResponse.json({ pricingStructures: [], orgId: null });
  }

  const client = createSupabaseServer();
  const { data, error } = await client
    .from('pricing_structures')
    .select('id, name, created_at, updated_at')
    .eq('org_id', orgId)
    .order('name');

  if (error) {
    console.error('GET dashboard pricing-structures:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const pricingStructures = (data ?? []).map((r: { id: string; name: string; created_at: string; updated_at: string }) => ({
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ pricingStructures, orgId });
}
