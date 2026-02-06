import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getOrgsForDashboard, isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/**
 * Normalize serviceType/frequency to match quote page (QuotePageClient.tsx) so we pick the same range.
 */
function normalizeServiceTypeAndFrequency(
  rawServiceType: string,
  rawFrequency: string
): { serviceType: string; frequency: string } {
  const raw = String(rawServiceType ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
  let st = raw;
  if (st.includes('move') && (st.includes('out') || st === 'move_out' || st === 'moveout')) st = 'move-out';
  else if (st.includes('move') || st === 'move_in' || st === 'movein') st = 'move-in';
  else if (st.includes('deep') || st === 'deep_clean') st = 'deep';
  else if (st.includes('general') || st === 'general_cleaning') st = 'general';
  else if (st.includes('initial') || st === 'initial_cleaning') st = 'initial';

  let freq = String(rawFrequency ?? '').toLowerCase().trim();
  if (freq === 'biweekly') freq = 'bi-weekly';
  else if (freq === 'fourweek' || freq === 'monthly' || freq === 'one_time') freq = freq === 'one_time' ? 'one-time' : 'four-week';

  return { serviceType: st, frequency: freq };
}

/**
 * Derive the selected price range (same as "YOUR SELECTED SERVICE" on the quote page).
 * Uses the same normalization and if/else order as QuotePageClient.
 */
function getSelectedRangeFromPayload(
  payload: any,
  rowServiceType?: string | null,
  rowFrequency?: string | null
): { low: number; high: number } | null {
  if (!payload?.ranges) return null;
  const ranges = payload.ranges as Record<string, { low: number; high: number } | undefined>;
  const rawServiceType = payload.serviceType ?? rowServiceType ?? '';
  const rawFrequency = payload.frequency ?? rowFrequency ?? '';
  const { serviceType, frequency } = normalizeServiceTypeAndFrequency(rawServiceType, rawFrequency);

  // For one-time types, ignore stored frequency (same as quote page) so we pick the correct range
  const effectiveFreq = ['move-in', 'move-out', 'deep'].includes(serviceType) ? '' : frequency;
  // Exact same order as quote page: move-in, move-out, deep, weekly, bi-weekly, four-week, else general
  if (serviceType === 'move-in' && ranges.moveInOutBasic) return ranges.moveInOutBasic;
  if (serviceType === 'move-out' && ranges.moveInOutFull) return ranges.moveInOutFull;
  if (serviceType === 'deep' && ranges.deep) return ranges.deep;
  if (effectiveFreq === 'weekly' && ranges.weekly) return ranges.weekly;
  if (effectiveFreq === 'bi-weekly' && ranges.biWeekly) return ranges.biWeekly;
  if ((effectiveFreq === 'four-week' || effectiveFreq === 'monthly') && ranges.fourWeek) return ranges.fourWeek;
  // Quote page "else selectedRange = quoteResult.ranges.general"
  if (ranges.general) return ranges.general;
  return null;
}

const SERVICE_TYPE_DISPLAY: Record<string, string> = {
  'move-in': 'Move-In/Move-Out Basic Clean',
  'move-out': 'Move-In/Move-Out Deep Clean',
  deep: 'One Time Deep Clean',
  initial: 'Initial Deep Cleaning',
  general: 'General Clean',
};

/** Human-readable frequency for table (so "Bi Weekly" and "Four-weeks" appear, not raw keys). */
const FREQUENCY_DISPLAY: Record<string, string> = {
  weekly: 'Weekly',
  'bi-weekly': 'Bi Weekly',
  'four-week': 'Four-weeks',
  monthly: 'Four-weeks',
};

/**
 * Get display service_type and frequency for table (match quote page: one-time types show no frequency).
 * When initial/general + recurring frequency, return summary-style labels so table matches quote summary.
 */
function getDisplayServiceAndFrequency(
  payload: any,
  rowServiceType?: string | null,
  rowFrequency?: string | null
): {
  serviceTypeDisplay: string;
  frequency: string;
  frequencyDisplay: string;
  isInitialPlusFrequency: boolean;
  initialRange: { low: number; high: number } | null;
  recurringRange: { low: number; high: number } | null;
  serviceTypeDisplayLong: string | null;
} {
  const rawServiceType = payload?.serviceType ?? rowServiceType ?? '';
  const rawFrequency = payload?.frequency ?? rowFrequency ?? '';
  const { serviceType, frequency } = normalizeServiceTypeAndFrequency(rawServiceType, rawFrequency);
  const effectiveFrequency = ['move-in', 'move-out', 'deep'].includes(serviceType) ? '' : frequency;
  const hasRecurringFreq = ['weekly', 'bi-weekly', 'four-week'].includes(effectiveFrequency);
  const isInitialPlusFrequency = (serviceType === 'general' || serviceType === 'initial') && hasRecurringFreq;
  const frequencyDisplay = effectiveFrequency ? (FREQUENCY_DISPLAY[effectiveFrequency] ?? effectiveFrequency) : '';
  const serviceTypeDisplay = SERVICE_TYPE_DISPLAY[serviceType] || rawServiceType || rowServiceType || '';
  const serviceTypeDisplayLong = payload?.serviceTypeLabel && isInitialPlusFrequency ? payload.serviceTypeLabel : null;
  const ranges = payload?.ranges as Record<string, { low: number; high: number } | undefined> | undefined;
  const initialRange = isInitialPlusFrequency && ranges
    ? (serviceType === 'initial' ? ranges.initial : ranges.general)
    : null;
  const recurringRange = isInitialPlusFrequency && ranges
    ? (effectiveFrequency === 'weekly' ? ranges.weekly : effectiveFrequency === 'bi-weekly' ? ranges.biWeekly : ranges.fourWeek)
    : null;
  return {
    serviceTypeDisplay,
    frequency: effectiveFrequency,
    frequencyDisplay,
    isInitialPlusFrequency: !!isInitialPlusFrequency,
    initialRange: initialRange ?? null,
    recurringRange: recurringRange ?? null,
    serviceTypeDisplayLong: serviceTypeDisplayLong || null,
  };
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
            .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at, payload, status')
            .in('tool_id', toolIdsForOrg)
            .order('created_at', { ascending: false })
            .limit(2000);
          quotes = result.data ?? [];
          error = result.error;
        }
      } catch {
        const result = await supabase
          .from('quotes')
          .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at, payload, status')
          .order('created_at', { ascending: false })
          .limit(2000);
        quotes = result.data ?? [];
        error = result.error;
      }
    } else {
      const result = await supabase
        .from('quotes')
        .select('id, quote_id, tool_id, first_name, last_name, email, phone, address, city, state, postal_code, service_type, frequency, price_low, price_high, square_feet, bedrooms, created_at, payload, status')
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
      let frequency = q.frequency;
      let service_type = q.service_type;
      let price_initial_low: number | null = null;
      let price_initial_high: number | null = null;
      let price_recurring_low: number | null = null;
      let price_recurring_high: number | null = null;
      // When payload exists, derive price and display labels from it (same logic as quote page) so table matches quote page
      if (q.payload) {
        const display = getDisplayServiceAndFrequency(q.payload, q.service_type, q.frequency);
        if (display.isInitialPlusFrequency && display.initialRange && display.recurringRange) {
          // Match quote summary: show both initial clean and selected frequency with their prices
          service_type = display.serviceTypeDisplayLong || (display.serviceTypeDisplay === 'Initial Deep Cleaning' ? 'Initial Deep Cleaning (Recurring)' : 'Initial General Clean (Recurring)');
          frequency = `Your Selected Frequency: ${display.frequencyDisplay}`;
          price_initial_low = display.initialRange.low;
          price_initial_high = display.initialRange.high;
          price_recurring_low = display.recurringRange.low;
          price_recurring_high = display.recurringRange.high;
          priceLow = display.initialRange.low;
          priceHigh = display.initialRange.high;
        } else {
          const range = getSelectedRangeFromPayload(
            q.payload,
            q.service_type,
            q.frequency
          );
          if (range) {
            priceLow = range.low;
            priceHigh = range.high;
          }
          frequency = display.frequencyDisplay || display.frequency;
          if (display.serviceTypeDisplay) service_type = display.serviceTypeDisplay;
        }
      } else if (frequency) {
        const { frequency: normFreq } = normalizeServiceTypeAndFrequency(q.service_type ?? '', frequency);
        frequency = FREQUENCY_DISPLAY[normFreq] ?? normFreq ?? frequency;
      }
      const { payload: _payload, ...rest } = q;
      const isDisqualified = (q as { status?: string }).status === 'disqualified';
      const disqualifiedOptionLabel = isDisqualified && _payload && typeof _payload === 'object' && _payload !== null && 'disqualifiedOptionLabel' in _payload
        ? String((_payload as { disqualifiedOptionLabel?: string }).disqualifiedOptionLabel ?? '')
        : undefined;
      return {
        ...rest,
        service_type: isDisqualified ? (disqualifiedOptionLabel ? `Disqualified: ${disqualifiedOptionLabel}` : 'Disqualified') : service_type,
        frequency: isDisqualified ? '' : frequency,
        price_low: isDisqualified ? null : priceLow,
        price_high: isDisqualified ? null : priceHigh,
        ...(price_initial_low != null && !isDisqualified && { price_initial_low: price_initial_low as number }),
        ...(price_initial_high != null && !isDisqualified && { price_initial_high: price_initial_high as number }),
        ...(price_recurring_low != null && !isDisqualified && { price_recurring_low: price_recurring_low as number }),
        ...(price_recurring_high != null && !isDisqualified && { price_recurring_high: price_recurring_high as number }),
        toolName: tool?.name ?? 'Legacy',
        toolSlug: tool?.slug ?? null,
        ...(disqualifiedOptionLabel && { disqualifiedOptionLabel }),
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
