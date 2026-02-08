import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { listGHLQuoteRecords } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

function mapQuotesToResponse(records: any[]) {
  const rawQuotes = records.map(mapGHLQuoteToDashboard);
  return rawQuotes.map((q: any) => {
    const display = getDisplayServiceAndFrequency(q.payload, q.service_type, q.frequency);
    let service_type = q.service_type;
    let frequency = q.frequency;
    let priceLow = q.price_low;
    let priceHigh = q.price_high;
    let price_initial_low: number | null = null;
    let price_initial_high: number | null = null;
    let price_recurring_low: number | null = null;
    let price_recurring_high: number | null = null;
    if (q.payload && display.isInitialPlusFrequency && display.initialRange && display.recurringRange) {
      service_type = display.serviceTypeDisplayLong || 'Initial/Recurring';
      frequency = `Your Selected Frequency: ${display.frequencyDisplay}`;
      price_initial_low = display.initialRange.low;
      price_initial_high = display.initialRange.high;
      price_recurring_low = display.recurringRange.low;
      price_recurring_high = display.recurringRange.high;
      priceLow = display.initialRange.low;
      priceHigh = display.initialRange.high;
    } else if (q.payload) {
      const range = getSelectedRangeFromPayload(q.payload, q.service_type, q.frequency);
      if (range) {
        priceLow = range.low;
        priceHigh = range.high;
      }
      frequency = display.frequencyDisplay || display.frequency;
      if (display.serviceTypeDisplay) service_type = display.serviceTypeDisplay;
    }
    const { payload: _p, ...rest } = q;
    const isDisqualified = q.status === 'disqualified';
    return {
      ...rest,
      service_type: isDisqualified ? 'Disqualified' : service_type,
      frequency: isDisqualified ? '' : frequency,
      price_low: isDisqualified ? null : priceLow,
      price_high: isDisqualified ? null : priceHigh,
      ...(price_initial_low != null && !isDisqualified && { price_initial_low }),
      ...(price_initial_high != null && !isDisqualified && { price_initial_high }),
      ...(price_recurring_low != null && !isDisqualified && { price_recurring_low }),
      ...(price_recurring_high != null && !isDisqualified && { price_recurring_high }),
      toolName: 'Quote',
      toolSlug: null,
      contactId: null,
    };
  });
}

/** Map GHL quote record to dashboard quote shape */
function mapGHLQuoteToDashboard(record: any): any {
  const p = record.properties ?? record.customFields ?? record;
  const get = (key: string) => p[key] ?? p[`custom_objects.quotes.${key}`] ?? null;
  const quoteId = get('quote_id') ?? record.id;
  return {
    id: record.id,
    quote_id: quoteId,
    tool_id: null,
    property_id: null,
    first_name: get('first_name'),
    last_name: get('last_name'),
    email: get('email'),
    phone: get('phone'),
    address: get('address') ?? get('service_address'),
    city: get('city'),
    state: get('state'),
    postal_code: get('postal_code') ?? get('zip'),
    service_type: get('service_type') ?? (Array.isArray(get('type')) ? get('type')[0] : get('type')),
    frequency: get('frequency'),
    price_low: get('price_low') ?? get('priceLow'),
    price_high: get('price_high') ?? get('priceHigh'),
    square_feet: get('square_feet') ?? get('squareFootage'),
    bedrooms: get('bedrooms'),
    created_at: record.createdAt ?? record.dateAdded ?? new Date().toISOString(),
    payload: typeof p.payload === 'object' ? p.payload : (p.payload ? JSON.parse(p.payload) : null),
    status: get('status') ?? 'quote',
  };
}

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

const emptyQuotes = () => NextResponse.json({ quotes: [], isSuperAdmin: false, isOrgAdmin: false });

/** GET /api/dashboard/quotes - GHL only: quotes from GHL custom objects */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ quotes: [], isSuperAdmin: false, isOrgAdmin: false, locationIdRequired: true });
    if ('needsConnect' in ctx) return emptyQuotes();

    try {
      const credentials = { token: ctx.token, locationId: ctx.locationId };
      const records = await listGHLQuoteRecords(ctx.locationId, { limit: 2000 }, credentials);
      const withToolInfo = mapQuotesToResponse(records);
      return NextResponse.json({
        quotes: withToolInfo,
        isSuperAdmin: false,
        isOrgAdmin: false,
      });
    } catch (err) {
      console.warn('Quotes: GHL fetch error', ctx.locationId, err);
      return emptyQuotes();
    }
  } catch (err) {
    console.error('Dashboard quotes error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
