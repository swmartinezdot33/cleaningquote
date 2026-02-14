import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { getQuoteRecords } from '@/lib/ghl/ghl-client';
import { getContactIdForQuoteRecord, getContactById } from '@/lib/ghl/client';
import * as configStore from '@/lib/config/store';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function mapQuotesToResponse(rawQuotes: any[], toolIdToName: Map<string, string> = new Map()) {
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
    const fromPayload = q.payload && typeof q.payload === 'object' ? [q.payload.firstName ?? q.payload.first_name, q.payload.lastName ?? q.payload.last_name].filter(Boolean).join(' ') : null;
    const contactNameFromRecord = [q.first_name, q.last_name].filter(Boolean).join(' ') || fromPayload || q.email || (q.payload?.email ?? null) || null;
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
      tool_id: q.tool_id ?? null,
      toolName: (q.quote_tool_used && String(q.quote_tool_used).trim()) || (q.tool_id && toolIdToName.has(q.tool_id) ? toolIdToName.get(q.tool_id)! : null) || 'Quote',
      toolSlug: null,
      contactId: q.contactId ?? null,
      contactName: contactNameFromRecord,
    };
  });
}

function parseNum(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  const n = typeof v === 'string' ? Number(v) : Number(v);
  return Number.isNaN(n) ? null : n;
}

/** Normalize GHL record properties: API can return properties as array of { key, valueString } or as object. */
function propertiesToObject(record: any): Record<string, unknown> {
  const raw = record.properties ?? record.customFields ?? record;
  if (Array.isArray(raw)) {
    const obj: Record<string, unknown> = {};
    for (const item of raw) {
      const k = item?.key ?? item?.name;
      const v = item?.valueString ?? item?.value ?? item?.values?.[0];
      if (k != null) obj[String(k)] = v;
    }
    return obj;
  }
  return typeof raw === 'object' && raw !== null ? raw : {};
}

/** Try multiple property key variants (GHL may use display names or different casing). */
function getProp(p: Record<string, unknown>, ...keys: string[]): string | number | null | undefined {
  for (const key of keys) {
    const v = p[key] ?? (key.includes('.') ? undefined : p[`custom_objects.quotes.${key}`]);
    if (v != null && v !== '') return v as string | number;
  }
  return null;
}

/** Map GHL quote record to dashboard quote shape. Preserves contactId when present on the record (GHL association). */
function mapGHLQuoteToDashboard(record: any): any {
  const p = propertiesToObject(record);
  const get = (key: string) => (p[key] ?? p[`custom_objects.quotes.${key}`] ?? null) as string | number | null | undefined;
  const quoteId = get('quote_id') ?? record.id;
  const contactId = record.contactId ?? record.contact_id ?? get('contactId') ?? get('contact_id') ?? null;
  const toolId = (get('tool_id') ?? get('toolId') ?? (record as any).tool_id ?? (record as any).toolId) as string | null | undefined;
  const quoteToolUsed = (get('quote_tool_used') ?? (record as any).quote_tool_used) as string | null | undefined;
  const priceLow = parseNum(get('price_low') ?? get('priceLow') ?? (record as any).price_low ?? (record as any).priceLow);
  const priceHigh = parseNum(get('price_high') ?? get('priceHigh') ?? (record as any).price_high ?? (record as any).priceHigh);
  const rawPayload = (() => {
    const raw = get('payload') ?? p.payload;
    if (raw == null) return null as Record<string, unknown> | null;
    if (typeof raw === 'object' && raw !== null) return raw as Record<string, unknown>;
    if (typeof raw !== 'string') return null as Record<string, unknown> | null;
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null as Record<string, unknown> | null;
    }
  })();
  // Fallbacks from payload when top-level properties are missing (form data often stored only in payload)
  const firstName = get('first_name') ?? getProp(p, 'First Name', 'firstName', 'first name') ?? (rawPayload?.['firstName'] ?? rawPayload?.['first_name']) ?? null;
  const lastName = get('last_name') ?? getProp(p, 'Last Name', 'lastName', 'last name') ?? (rawPayload?.['lastName'] ?? rawPayload?.['last_name']) ?? null;
  const emailVal = get('email') ?? getProp(p, 'Email', 'email') ?? (rawPayload?.['email'] ?? null) ?? null;
  const toolNameFromPayload = (rawPayload?.['toolName'] ?? rawPayload?.['quote_tool_used'] ?? rawPayload?.['tool_name']) as string | null | undefined;
  const quoteToolUsedFinal = (quoteToolUsed && String(quoteToolUsed).trim()) || (toolNameFromPayload && String(toolNameFromPayload).trim()) || null;
  // Price from payload.ranges when not in top-level (getSelectedRangeFromPayload is called later in mapQuotesToResponse)
  let finalPriceLow = priceLow;
  let finalPriceHigh = priceHigh;
  if ((finalPriceLow == null || finalPriceHigh == null) && rawPayload?.ranges && typeof rawPayload.ranges === 'object') {
    const ranges = rawPayload.ranges as Record<string, { low?: number; high?: number } | undefined>;
    const firstRange = ranges.general ?? ranges.weekly ?? ranges.biWeekly ?? ranges.fourWeek ?? ranges.deep ?? ranges.moveInOutBasic ?? ranges.moveInOutFull;
    if (firstRange && typeof firstRange.low === 'number' && typeof firstRange.high === 'number') {
      finalPriceLow = finalPriceLow ?? firstRange.low;
      finalPriceHigh = finalPriceHigh ?? firstRange.high;
    }
  }
  return {
    id: record.id,
    quote_id: quoteId,
    tool_id: toolId && String(toolId).trim() ? String(toolId).trim() : null,
    quote_tool_used: quoteToolUsedFinal,
    property_id: null,
    first_name: firstName,
    last_name: lastName,
    email: emailVal,
    phone: get('phone'),
    address: get('address') ?? get('service_address'),
    city: get('city'),
    state: get('state'),
    postal_code: get('postal_code') ?? get('zip'),
    service_type: get('service_type') ?? (() => { const t = get('type'); return Array.isArray(t) ? t[0] : t; })(),
    frequency: get('frequency'),
    price_low: finalPriceLow,
    price_high: finalPriceHigh,
    square_feet: get('square_feet') ?? get('squareFootage'),
    bedrooms: get('bedrooms'),
    created_at: record.createdAt ?? record.dateAdded ?? new Date().toISOString(),
    payload: rawPayload,
    status: get('status') ?? 'quote',
    contactId: contactId || null,
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

const emptyQuotes = (opts?: { page?: number; perPage?: number }) =>
  NextResponse.json({
    quotes: [],
    isSuperAdmin: false,
    isOrgAdmin: false,
    page: opts?.page ?? 1,
    perPage: opts?.perPage ?? 25,
    hasMore: false,
  });

/** GET /api/dashboard/quotes - GHL only: quotes from GHL custom objects. Supports server-side pagination (page, perPage). */
export async function GET(request: NextRequest) {
  const startMs = Date.now();
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ quotes: [], isSuperAdmin: false, isOrgAdmin: false, locationIdRequired: true });
    if ('needsConnect' in ctx) return emptyQuotes();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') ?? '25', 10) || 25));

    try {
      const credentials = { token: ctx.token, locationId: ctx.locationId };
      const result = await getQuoteRecords(ctx.locationId, credentials, { limit: perPage, page });
      if (!result.ok) {
        console.warn('[CQ Quotes] GHL getQuoteRecords failed', { locationId: ctx.locationId?.slice(0, 12), error: result.error.message });
        return NextResponse.json({
          quotes: [],
          error: result.error.message,
          isSuperAdmin: false,
          isOrgAdmin: false,
          page,
          perPage,
          hasMore: false,
        });
      }
      const records = result.data;
      const rawQuotes = records.map(mapGHLQuoteToDashboard);

      let assocCalls = 0;
      let contactCalls = 0;

      // Resolve contact via GHL quote–contact association only for this page's records
      const contactIdsFromAssoc = await Promise.all(
        rawQuotes.map((q, i) => {
          if (q.contactId) return Promise.resolve(q.contactId);
          assocCalls++;
          return getContactIdForQuoteRecord(records[i].id, ctx.locationId, credentials).then((id) => id ?? null);
        })
      );
      rawQuotes.forEach((q, i) => {
        if (!q.contactId && contactIdsFromAssoc[i]) q.contactId = contactIdsFromAssoc[i];
      });

      // Fetch contact details only for contacts that need name on this page
      const contactIdsNeedingName = [...new Set(rawQuotes.filter((q) => q.contactId && !q.first_name && !q.last_name && !q.email).map((q) => q.contactId!))];
      contactCalls = contactIdsNeedingName.length;
      const contactMap = new Map<string, { first_name: string | null; last_name: string | null; email: string | null }>();
      await Promise.all(
        contactIdsNeedingName.map(async (contactId) => {
          try {
            const contact = await getContactById(contactId, undefined, undefined, credentials);
            const firstName = (contact as any).firstName ?? (contact as any).first_name ?? null;
            const lastName = (contact as any).lastName ?? (contact as any).last_name ?? null;
            const email = (contact as any).email ?? null;
            contactMap.set(contactId, { first_name: firstName ?? null, last_name: lastName ?? null, email: email ?? null });
          } catch {
            contactMap.set(contactId, { first_name: null, last_name: null, email: null });
          }
        })
      );
      rawQuotes.forEach((q) => {
        if (q.contactId && !q.first_name && !q.last_name && !q.email) {
          const c = contactMap.get(q.contactId);
          if (c) {
            q.first_name = c.first_name;
            q.last_name = c.last_name;
            q.email = c.email;
          }
        }
      });

      // Resolve tool_id → name for Tool column (org from ghl_location_id → tools)
      let toolIdToName = new Map<string, string>();
      try {
        const orgIds = await configStore.getOrgIdsByGHLLocationId(ctx.locationId);
        if (orgIds.length > 0) {
          const supabase = createSupabaseServer();
          const { data: tools } = await supabase
            .from('tools')
            .select('id, name')
            .in('org_id', orgIds);
          if (tools?.length) {
            toolIdToName = new Map(tools.map((t: { id: string; name: string }) => [t.id, t.name]));
          }
        }
      } catch {
        // Non-fatal: show "Quote" when we can't resolve tool name
      }

      // Fill missing tool_id from Supabase quotes (for quotes created before we stored tool_id in GHL)
      const missingToolQuoteIds = rawQuotes.filter((q: any) => !q.tool_id && q.quote_id).map((q: any) => q.quote_id);
      if (missingToolQuoteIds.length > 0) {
        try {
          const supabase = createSupabaseServer();
          const { data: rows } = await supabase
            .from('quotes')
            .select('quote_id, tool_id')
            .in('quote_id', missingToolQuoteIds);
          if (rows?.length) {
            const entries = (rows as { quote_id: string; tool_id: string | null }[])
              .filter((r): r is { quote_id: string; tool_id: string } => r.tool_id != null)
              .map((r) => [r.quote_id, r.tool_id] as [string, string]);
            const quoteIdToToolId = new Map(entries);
            rawQuotes.forEach((q: any) => {
              if (!q.tool_id && q.quote_id && quoteIdToToolId.has(q.quote_id)) {
                q.tool_id = quoteIdToToolId.get(q.quote_id);
              }
            });
          }
        } catch {
          // Non-fatal
        }
      }

      const withToolInfo = mapQuotesToResponse(rawQuotes, toolIdToName);
      const totalMs = Date.now() - startMs;
      if (process.env.NODE_ENV !== 'test') {
        console.info('[CQ Quotes]', {
          recordsFetched: records.length,
          assocCalls,
          contactCalls,
          totalMs,
          page,
          perPage,
        });
      }
      return NextResponse.json({
        quotes: withToolInfo,
        isSuperAdmin: false,
        isOrgAdmin: false,
        page,
        perPage,
        hasMore: records.length >= perPage,
      });
    } catch (err) {
      console.warn('Quotes: GHL fetch error', ctx.locationId, err);
      return emptyQuotes({ page, perPage });
    }
  } catch (err) {
    console.error('Dashboard quotes error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
