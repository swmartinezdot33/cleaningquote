import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { getContactById, listContactNotes, updateContact, getQuoteRecordIdsForContact } from '@/lib/ghl/client';
import { getQuoteRecords } from '@/lib/ghl/ghl-client';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** Get a value from GHL quote record (properties array or flat keys). */
function getQuoteRecordProp(record: any, key: string): string | number | null | undefined {
  const raw = record.properties ?? record.customFields ?? record;
  if (Array.isArray(raw)) {
    const item = raw.find((p: any) => (p?.key ?? p?.name) === key || (p?.key ?? p?.name) === `custom_objects.quotes.${key}`);
    const v = item?.valueString ?? item?.value ?? item?.values?.[0];
    return v != null && v !== '' ? v : undefined;
  }
  if (typeof raw === 'object' && raw !== null) {
    const v = raw[key] ?? raw[`custom_objects.quotes.${key}`];
    return v != null && v !== '' ? v : undefined;
  }
  return (record[key] ?? undefined) ?? null;
}

/** Load quote custom object records from GHL that are associated with this contact (via relations). */
async function loadGHLQuotesForContact(
  contactId: string,
  locationId: string,
  credentials: { token: string; locationId: string }
): Promise<Array<{ id: string; quote_id: string; service_type: string | null; frequency: string | null; price_low: number | null; price_high: number | null; created_at: string; property_id: string | null }>> {
  const quoteIds = await getQuoteRecordIdsForContact(contactId, locationId, credentials);
  if (quoteIds.length === 0) return [];

  const result = await getQuoteRecords(locationId, credentials, { limit: 200 });
  if (!result.ok || !Array.isArray(result.data)) return [];

  const idSet = new Set(quoteIds);
  const records = result.data.filter((r: any) => r.id && idSet.has(r.id));
  const parseNum = (v: unknown): number | null => {
    if (v == null) return null;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    const n = typeof v === 'string' ? Number(v) : Number(v);
    return Number.isNaN(n) ? null : n;
  };

  return records.map((r: any) => ({
    id: r.id,
    quote_id: String(getQuoteRecordProp(r, 'quote_id') ?? r.id),
    service_type: (getQuoteRecordProp(r, 'service_type') ?? getQuoteRecordProp(r, 'type')) as string | null ?? null,
    frequency: (getQuoteRecordProp(r, 'frequency') as string | null) ?? null,
    price_low: parseNum(getQuoteRecordProp(r, 'price_low') ?? getQuoteRecordProp(r, 'priceLow')),
    price_high: parseNum(getQuoteRecordProp(r, 'price_high') ?? getQuoteRecordProp(r, 'priceHigh')),
    created_at: (r.createdAt ?? r.dateAdded ?? r.created_at ?? new Date().toISOString()) as string,
    property_id: (getQuoteRecordProp(r, 'property_id') ?? getQuoteRecordProp(r, 'propertyId')) as string | null ?? null,
  }));
}

/** Map GHL contact to ContactDetail shape (same pattern as contacts list). Includes customFields for CleanQuote home/quote display. */
function mapGHLContactToDetail(ghl: any, notes: Array<{ id: string; body: string; createdAt?: string }>) {
  const stage = (ghl.type ?? ghl.stage ?? 'lead').toLowerCase();
  const mapped = ['lead', 'quoted', 'booked', 'customer', 'churned'].includes(stage) ? stage : 'lead';
  const addr = [ghl.address1 ?? ghl.address, ghl.city, ghl.state, ghl.postalCode ?? ghl.postal_code, ghl.country].filter(Boolean).join(', ');
  const customFields = ghl.customFields && typeof ghl.customFields === 'object'
    ? (Array.isArray(ghl.customFields)
        ? Object.fromEntries((ghl.customFields as Array<{ key: string; value: string }>).map((f: { key: string; value: string }) => [f.key, f.value]))
        : { ...ghl.customFields })
    : {};
  return {
    contact: {
      id: ghl.id ?? '',
      first_name: ghl.firstName ?? ghl.first_name ?? null,
      last_name: ghl.lastName ?? ghl.last_name ?? null,
      email: ghl.email ?? null,
      phone: ghl.phone ?? null,
      stage: mapped,
      source: ghl.source ?? null,
      tags: Array.isArray(ghl.tags) ? ghl.tags : [],
      created_at: ghl.dateAdded ?? ghl.date_added ?? ghl.createdAt ?? new Date().toISOString(),
    },
    customFields: customFields as Record<string, string>,
    address: {
      street: ghl.address1 ?? ghl.address ?? null,
      city: ghl.city ?? null,
      state: ghl.state ?? null,
      postal_code: ghl.postalCode ?? ghl.postal_code ?? null,
      country: ghl.country ?? null,
    },
    properties: [] as Array<{ id: string; address: string | null; city: string | null; state: string | null; postal_code: string | null; nickname: string | null; stage: string }>,
    quotes: [] as Array<{ id: string; quote_id: string; service_type: string | null; frequency: string | null; price_low: number | null; price_high: number | null; created_at: string; property_id: string | null }>,
    schedules: [],
    appointments: [],
    activities: [],
    notes: notes.map((n) => ({ id: n.id, content: n.body ?? '', created_at: n.createdAt ?? new Date().toISOString() })),
  };
}

/** Load properties and quotes from Supabase for this GHL contact id so they show in their own sections. */
async function loadSupabasePropertiesAndQuotes(
  ghlContactId: string
): Promise<{
  properties: Array<{ id: string; address: string | null; city: string | null; state: string | null; postal_code: string | null; nickname: string | null; stage: string }>;
  quotes: Array<{ id: string; quote_id: string; service_type: string | null; frequency: string | null; price_low: number | null; price_high: number | null; created_at: string; property_id: string | null }>;
}> {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { properties: [], quotes: [] };

  const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
  const cookieStore = await cookies();
  const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;
  if (!selectedOrgId) return { properties: [], quotes: [] };

  // Find our contact by GHL contact id (so we can load properties by contact_id)
  const { data: supabaseContact } = await (supabase as any)
    .from('contacts')
    .select('id')
    .eq('ghl_contact_id', ghlContactId)
    .eq('org_id', selectedOrgId)
    .maybeSingle();

  let properties: Array<{ id: string; address: string | null; city: string | null; state: string | null; postal_code: string | null; nickname: string | null; stage: string }> = [];
  if (supabaseContact?.id) {
    const { data: props } = await (supabase as any)
      .from('properties')
      .select('id, address, city, state, postal_code, nickname, stage')
      .eq('contact_id', supabaseContact.id)
      .eq('org_id', selectedOrgId)
      .order('created_at', { ascending: false });
    properties = (props ?? []).map((p: any) => ({
      id: p.id,
      address: p.address ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      postal_code: p.postal_code ?? null,
      nickname: p.nickname ?? null,
      stage: p.stage ?? 'active',
    }));
  }

  // Quotes: by ghl_contact_id, and also by property (for quotes linked only via property, e.g. internal tool)
  const { data: tools } = await (supabase as any)
    .from('tools')
    .select('id')
    .eq('org_id', selectedOrgId);
  const toolIds = (tools ?? []).map((t: { id: string }) => t.id);
  if (toolIds.length === 0) {
    return { properties, quotes: [] };
  }
  const propertyIds = properties.map((p) => p.id);
  let quoteRows: any[] = [];
  const { data: byGhl } = await (supabase as any)
    .from('quotes')
    .select('id, quote_id, service_type, frequency, price_low, price_high, created_at, property_id')
    .eq('ghl_contact_id', ghlContactId)
    .in('tool_id', toolIds)
    .order('created_at', { ascending: false });
  quoteRows = byGhl ?? [];
  if (propertyIds.length > 0) {
    const { data: byProperty } = await (supabase as any)
      .from('quotes')
      .select('id, quote_id, service_type, frequency, price_low, price_high, created_at, property_id')
      .in('property_id', propertyIds)
      .in('tool_id', toolIds)
      .order('created_at', { ascending: false });
    const seen = new Set(quoteRows.map((q: any) => q.id));
    for (const q of byProperty ?? []) {
      if (!seen.has(q.id)) {
        seen.add(q.id);
        quoteRows.push(q);
      }
    }
    quoteRows.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  const quotes = quoteRows.map((q: any) => ({
    id: q.id,
    quote_id: q.quote_id,
    service_type: q.service_type ?? null,
    frequency: q.frequency ?? null,
    price_low: q.price_low ?? null,
    price_high: q.price_high ?? null,
    created_at: q.created_at ?? new Date().toISOString(),
    property_id: q.property_id ?? null,
  }));

  return { properties, quotes };
}

/** GET /api/dashboard/crm/contacts/[id] - contact detail with properties, quotes, schedules, activities */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    if ('needsConnect' in ctx) return NextResponse.json({ error: 'Connect your location first' }, { status: 400 });

    try {
      const credentials = { token: ctx.token, locationId: ctx.locationId };
      const [ghlContact, ghlNotes] = await Promise.all([
        getContactById(id, undefined, undefined, credentials),
        listContactNotes(id, credentials),
      ]);
      const detail = mapGHLContactToDetail(ghlContact, ghlNotes);

      // Enrich with Supabase properties and quotes so contact page has separate Quotes and Properties sections
      try {
        const { properties, quotes } = await loadSupabasePropertiesAndQuotes(id);
        if (properties.length > 0 || quotes.length > 0) {
          detail.properties = properties;
          detail.quotes = quotes;
        }
      } catch (enrichErr) {
        console.warn('CRM contact detail: Supabase enrich failed', id, enrichErr);
      }

      // When no Supabase quotes, load GHL association custom objects (Quotes) for this contact
      if (detail.quotes.length === 0) {
        try {
          const ghlQuotes = await loadGHLQuotesForContact(id, ctx.locationId, credentials);
          if (ghlQuotes.length > 0) detail.quotes = ghlQuotes;
        } catch (ghlErr) {
          console.warn('CRM contact detail: GHL quotes for contact failed', id, ghlErr);
        }
      }

      return NextResponse.json(detail);
    } catch (err) {
      console.warn('CRM contact detail: GHL fetch error', id, err);
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
  } catch (err) {
    console.error('CRM contact detail error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/** PATCH /api/dashboard/crm/contacts/[id] - GHL only: update contact in GHL */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await resolveGHLContext(request);
    if (!ctx || 'needsConnect' in ctx) {
      return NextResponse.json({ error: 'Connect your location first' }, { status: 400 });
    }

    const body = await request.json();
    const contact = await updateContact(
      id,
      {
        firstName: String(body.first_name ?? ''),
        lastName: String(body.last_name ?? ''),
        email: body.email?.trim() || undefined,
        phone: body.phone?.trim() || undefined,
        source: body.source,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
      },
      ctx.token,
      ctx.locationId
    );
    return NextResponse.json({
      contact: {
        id: contact.id,
        first_name: contact.firstName,
        last_name: contact.lastName,
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        stage: (contact as any).type ?? 'lead',
      },
    });
  } catch (err) {
    console.error('CRM contact update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update contact' },
      { status: 500 }
    );
  }
}
