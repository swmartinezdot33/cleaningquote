import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard } from '@/lib/org-auth';
import { getSession } from '@/lib/ghl/session';
import { getGHLCredentials } from '@/lib/ghl/credentials';
import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';
import { getLocationIdFromRequest } from '@/lib/request-utils';
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
  const fetchLimit = (stage || search) ? 500 : perPage * 3;
  const { contacts: ghlContacts } = await listGHLContacts(
    locationId,
    { limit: fetchLimit },
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

/** GET /api/dashboard/crm/contacts - list contacts for selected org or GHL location */
export async function GET(request: NextRequest) {
  try {
    // 1) locationId from query/header (GHL iframe flow - client passes from GHL context)
    const requestLocationId = getLocationIdFromRequest(request);
    if (requestLocationId) {
      const token = await getOrFetchTokenForLocation(requestLocationId);
      if (token) {
        const { searchParams } = new URL(request.url);
        const result = await fetchContactsFromGHL(requestLocationId, token, searchParams);
        return NextResponse.json(result);
      }
      return NextResponse.json({ contacts: [], total: 0 });
    }

    const session = await getSession();
    if (session) {
      const credentials = await getGHLCredentials({ session });
      if (!credentials.token || !credentials.locationId) {
        return NextResponse.json({ contacts: [], total: 0 });
      }
      const { searchParams } = new URL(request.url);
      const result = await fetchContactsFromGHL(credentials.locationId, credentials.token, searchParams);
      return NextResponse.json(result);
    }

    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
    const cookieStore = await cookies();
    let selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;
    if (selectedOrgId && !orgs.some((o: { id: string }) => o.id === selectedOrgId)) {
      selectedOrgId = orgs[0]?.id;
    }

    if (!selectedOrgId) {
      return NextResponse.json({ contacts: [], total: 0 });
    }

    const { searchParams } = new URL(request.url);
    const stage = searchParams.get('stage');
    const search = searchParams.get('search')?.trim();
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('perPage') ?? '25', 10)));
    const offset = (page - 1) * perPage;

    let query = supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, stage, source, tags, created_at', { count: 'exact' })
      .eq('org_id', selectedOrgId)
      .order('created_at', { ascending: false });

    if (stage && ['lead', 'quoted', 'booked', 'customer', 'churned'].includes(stage)) {
      query = query.eq('stage', stage);
    }

    if (search) {
      const term = `%${search}%`;
      query = query.or(`first_name.ilike.${term},last_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`);
    }

    const { data: contacts, error, count } = await query.range(offset, offset + perPage - 1);

    if (error) {
      const msg = String(error?.message ?? '');
      if (msg.includes('does not exist')) {
        return NextResponse.json({ contacts: [], total: 0, page, perPage });
      }
      console.error('CRM contacts fetch error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      contacts: contacts ?? [],
      total: count ?? 0,
      page,
      perPage,
    });
  } catch (err) {
    console.error('CRM contacts error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/** POST /api/dashboard/crm/contacts - create contact */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
    const cookieStore = await cookies();
    const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;

    if (!selectedOrgId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    const body = await request.json();
    const { first_name, last_name, email, phone, source } = body;

    const { data: contact, error } = await (supabase as any)
      .from('contacts')
      .insert({
        org_id: selectedOrgId,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        source: source ?? 'Manual Entry',
        stage: 'lead',
      })
      .select()
      .single();

    if (error) {
      console.error('CRM contact create error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contact });
  } catch (err) {
    console.error('CRM contact create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create contact' },
      { status: 500 }
    );
  }
}
