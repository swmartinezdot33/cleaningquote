import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getOrgsForDashboard, isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** Derive selected price range from stored payload when price_low/price_high are null (e.g. older quotes). */
function getSelectedRangeFromPayload(payload: any): { low: number; high: number } | null {
  if (!payload?.ranges) return null;
  const ranges = payload.ranges as Record<string, { low: number; high: number } | undefined>;
  const frequency = String(payload.frequency ?? '').toLowerCase().trim();
  const freqNorm = frequency === 'biweekly' ? 'bi-weekly' : frequency;
  const serviceType = String(payload.serviceType ?? '').toLowerCase().trim();
  if (freqNorm === 'weekly' && ranges.weekly) return ranges.weekly;
  if (freqNorm === 'bi-weekly' && ranges.biWeekly) return ranges.biWeekly;
  if ((freqNorm === 'four-week' || freqNorm === 'monthly') && ranges.fourWeek) return ranges.fourWeek;
  if (freqNorm === 'one-time' || !freqNorm) {
    if (serviceType === 'initial' && ranges.initial) return ranges.initial;
    if (serviceType === 'deep' && ranges.deep) return ranges.deep;
    if (serviceType === 'general' && ranges.general) return ranges.general;
    if (serviceType === 'move-in' && ranges.moveInOutBasic) return ranges.moveInOutBasic;
    if (serviceType === 'move-out' && ranges.moveInOutFull) return ranges.moveInOutFull;
  }
  return null;
}

/**
 * GET /api/dashboard/quotes
 * List quotes for the current user's tools (from Supabase).
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
    const cookieStore = await cookies();
    const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;
    const isSuperAdmin = isSuperAdminEmail(user.email ?? undefined);
    const selectedOrg = orgs.find((o: { id: string; role?: string }) => o.id === selectedOrgId);
    const isOrgAdmin = selectedOrg?.role === 'admin';

    let toolMap: Map<string, { name: string; slug: string }>;
    if (isSuperAdmin) {
      try {
        const admin = createSupabaseServer();
        const { data: orgTools } = await admin.from('tools').select('id, name, slug').eq('org_id', selectedOrgId ?? '');
        toolMap = new Map((orgTools ?? []).map((t: { id: string; name: string; slug: string }) => [t.id, { name: t.name, slug: t.slug }]));
      } catch {
        const { data: userTools } = await supabase.from('tools').select('id, name, slug').eq('org_id', selectedOrgId ?? '');
        toolMap = new Map((userTools ?? []).map((t: { id: string; name: string; slug: string }) => [t.id, { name: t.name, slug: t.slug }]));
      }
    } else {
      const orgIds = orgs.map((o) => o.id);
      const { data: userTools } = await supabase
        .from('tools')
        .select('id, name, slug')
        .in('org_id', orgIds.length ? orgIds : ['']);
      toolMap = new Map((userTools ?? []).map((t: { id: string; name: string; slug: string }) => [t.id, { name: t.name, slug: t.slug }]));
    }
    const toolIds = new Set(toolMap.keys());

    let quotes: unknown[];
    let error: { message: string } | null = null;
    if (isSuperAdmin) {
      try {
        const admin = createSupabaseServer();
        const toolIdsForOrg = Array.from(toolMap.keys());
        if (toolIdsForOrg.length === 0) {
          quotes = [];
        } else {
          const result = await admin
            .from('quotes')
            .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at, payload')
            .in('tool_id', toolIdsForOrg)
            .order('created_at', { ascending: false })
            .limit(2000);
          quotes = result.data ?? [];
          error = result.error;
        }
      } catch {
        const result = await supabase
          .from('quotes')
          .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at, payload')
          .order('created_at', { ascending: false })
          .limit(2000);
        quotes = result.data ?? [];
        error = result.error;
      }
    } else {
      const result = await supabase
        .from('quotes')
        .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at, payload')
        .order('created_at', { ascending: false })
        .limit(2000);
      quotes = result.data ?? [];
      error = result.error;
    }

    if (error) {
      console.error('Dashboard quotes fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter to user's tools (RLS on quotes filters by tool ownership)
    const filtered = (quotes ?? []).filter((q: any) => !q.tool_id || toolIds.has(q.tool_id));

    const withToolInfo = filtered.map((q: any) => {
      const tool = q.tool_id ? toolMap.get(q.tool_id) : null;
      let priceLow = q.price_low;
      let priceHigh = q.price_high;
      if ((priceLow == null && priceHigh == null) && q.payload) {
        const range = getSelectedRangeFromPayload(q.payload);
        if (range) {
          priceLow = range.low;
          priceHigh = range.high;
        }
      }
      const { payload: _payload, ...rest } = q;
      return {
        ...rest,
        price_low: priceLow,
        price_high: priceHigh,
        toolName: tool?.name ?? 'Legacy',
        toolSlug: tool?.slug ?? null,
      };
    });

    return NextResponse.json({
      quotes: withToolInfo,
      isSuperAdmin: !!isSuperAdmin,
      isOrgAdmin: !!isOrgAdmin,
    });
  } catch (err) {
    console.error('Dashboard quotes error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
