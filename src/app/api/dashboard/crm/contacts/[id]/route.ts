import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { getContactById, listContactNotes, updateContact } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/** Map GHL contact to ContactDetail shape (same pattern as contacts list) */
function mapGHLContactToDetail(ghl: any, notes: Array<{ id: string; body: string; createdAt?: string }>) {
  const stage = (ghl.type ?? ghl.stage ?? 'lead').toLowerCase();
  const mapped = ['lead', 'quoted', 'booked', 'customer', 'churned'].includes(stage) ? stage : 'lead';
  const addr = [ghl.address1 ?? ghl.address, ghl.city, ghl.state, ghl.postalCode ?? ghl.postal_code, ghl.country].filter(Boolean).join(', ');
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
    properties: addr ? [{ id: 'ghl-addr', address: addr, city: ghl.city ?? null, state: ghl.state ?? null, postal_code: ghl.postalCode ?? ghl.postal_code ?? null, nickname: null, stage: 'active' }] : [],
    quotes: [],
    schedules: [],
    appointments: [],
    activities: [],
    notes: notes.map((n) => ({ id: n.id, content: n.body ?? '', created_at: n.createdAt ?? new Date().toISOString() })),
  };
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
