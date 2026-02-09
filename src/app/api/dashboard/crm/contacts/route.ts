import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { listGHLContacts } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/** Map GHL contact to CRM contact shape */
function mapGHLContactToCRM(ghl: any): { id: string; first_name: string | null; last_name: string | null; email: string | null; phone: string | null; stage: string; created_at: string } {
  const stage = (ghl.type ?? 'lead').toLowerCase();
  const mapped = ['lead', 'quoted', 'booked', 'customer', 'churned'].includes(stage) ? stage : 'lead';
  return {
    id: ghl.id ?? '',
    first_name: ghl.firstName ?? ghl.first_name ?? null,
    last_name: ghl.lastName ?? ghl.last_name ?? null,
    email: ghl.email ?? null,
    phone: ghl.phone ?? null,
    stage: mapped,
    created_at: ghl.dateAdded ?? ghl.date_added ?? ghl.createdAt ?? new Date().toISOString(),
  };
}

async function fetchContactsFromGHL(locationId: string, token: string, searchParams: URLSearchParams) {
  const stage = searchParams.get('stage');
  const search = searchParams.get('search')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') ?? '25', 10)));
  // POST /contacts/search with Location token (no Location-Id header). Same as verify/stats routes.
  const { contacts: ghlContacts } = await listGHLContacts(
    locationId,
    { limit: 1000, page: 1, search: search ?? undefined },
    { token, locationId }
  );
  let mapped = ghlContacts.map(mapGHLContactToCRM);
  if (stage && ['lead', 'quoted', 'booked', 'customer', 'churned'].includes(stage)) {
    mapped = mapped.filter((c) => c.stage === stage);
  }
  if (search) {
    const term = search.toLowerCase();
    mapped = mapped.filter((c) => {
      const s = [c.first_name, c.last_name, c.email, c.phone].filter(Boolean).join(' ').toLowerCase();
      return s.includes(term);
    });
  }
  const start = (page - 1) * perPage;
  const paginated = mapped.slice(start, start + perPage);
  return { contacts: paginated, total: mapped.length, page, perPage };
}


function emptyContacts() {
  return NextResponse.json({ contacts: [], total: 0, page: 1, perPage: 25 });
}

/** GET /api/dashboard/crm/contacts - GHL only: decrypt context → locationId → token → GHL API */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ contacts: [], total: 0, page: 1, perPage: 25, locationIdRequired: true });
    if ('needsConnect' in ctx) {
      const requestHost = request.headers.get('host') ?? null;
      const reason = ctx.reason ?? null;
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'crm/contacts/route.ts',
          message: 'contacts GET needsConnect',
          data: {
            requestHost,
            locationIdPreview: ctx.locationId ? `${ctx.locationId.slice(0, 8)}..${ctx.locationId.slice(-4)}` : null,
            reason,
            hypothesisId: 'H1-H3',
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return NextResponse.json({
        contacts: [],
        total: 0,
        page: 1,
        perPage: 25,
        needsConnect: true,
        _debug: {
          requestHost,
          locationIdReceived: !!ctx.locationId,
          locationIdPreview: ctx.locationId ? `${ctx.locationId.slice(0, 8)}..${ctx.locationId.slice(-4)}` : null,
          reason,
        },
      });
    }

    try {
      const { searchParams } = new URL(request.url);
      console.log('[CQ CRM contacts] calling fetchContactsFromGHL', { locationId: ctx.locationId?.slice(0, 12) + '...', hasToken: !!ctx.token, stage: searchParams.get('stage') });
      const result = await fetchContactsFromGHL(ctx.locationId, ctx.token, searchParams);
      console.log('[CQ CRM contacts] fetchContactsFromGHL OK', { contactsCount: result.contacts?.length ?? 0 });
      return NextResponse.json(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[CQ CRM contacts] fetchContactsFromGHL error', { locationId: ctx.locationId?.slice(0, 12) + '...', err: msg });
      // We have a token; this is a GHL API error, not missing connection — don't tell user to reconnect.
      return NextResponse.json(
        { contacts: [], total: 0, page: 1, perPage: 25, error: msg },
        { status: 502 }
      );
    }
  } catch (err) {
    console.warn('CRM contacts error:', err);
    return emptyContacts();
  }
}

/** POST /api/dashboard/crm/contacts - GHL only: create contact in GHL */
export async function POST(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx || 'needsConnect' in ctx) {
      return NextResponse.json({ error: 'Connect your location first', needsConnect: true }, { status: 400 });
    }

    const body = await request.json();
    const { first_name, last_name, email, phone } = body;
    const { createOrUpdateContact } = await import('@/lib/ghl/client');
    const contact = await createOrUpdateContact(
      {
        firstName: first_name ?? '',
        lastName: last_name ?? '',
        email: email?.trim() || undefined,
        phone: phone?.trim() || undefined,
      },
      ctx.token,
      ctx.locationId
    );
    return NextResponse.json({
      contact: {
        id: contact.id,
        first_name: contact.firstName ?? first_name,
        last_name: contact.lastName ?? last_name,
        email: contact.email ?? email,
        phone: contact.phone ?? phone,
        stage: 'lead',
        created_at: (contact as { dateAdded?: string }).dateAdded ?? new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('CRM contact create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create contact' },
      { status: 500 }
    );
  }
}
