import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/crm/contacts/[id] - contact detail with properties, quotes, schedules, activities */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('org_id', selectedOrgId)
      .single();

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const [propsRes, activitiesRes, notesRes] = await Promise.all([
      supabase.from('properties').select('*').eq('contact_id', id).eq('org_id', selectedOrgId).order('created_at', { ascending: false }),
      supabase.from('activities').select('*').eq('contact_id', id).eq('org_id', selectedOrgId).order('created_at', { ascending: false }).limit(50),
      supabase.from('notes').select('*').eq('contact_id', id).eq('org_id', selectedOrgId).order('created_at', { ascending: false }).limit(50),
    ]);

    const properties = propsRes.data ?? [];
    const propertyIds = properties.map((p: { id: string }) => p.id);

    const [quotesRes, schedulesRes, appointmentsRes] = await Promise.all([
      propertyIds.length > 0
        ? supabase.from('quotes').select('*').in('property_id', propertyIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      propertyIds.length > 0
        ? supabase.from('service_schedules').select('*').in('property_id', propertyIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from('appointments').select('*').eq('contact_id', id).eq('org_id', selectedOrgId).order('scheduled_at', { ascending: false }).limit(50),
    ]);

    const quotes = quotesRes.data ?? [];
    const schedules = schedulesRes.data ?? [];
    const appointments = appointmentsRes.data ?? [];

    return NextResponse.json({
      contact,
      properties,
      quotes,
      schedules,
      appointments,
      activities: activitiesRes.data ?? [],
      notes: notesRes.data ?? [],
    });
  } catch (err) {
    console.error('CRM contact detail error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/** PATCH /api/dashboard/crm/contacts/[id] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.first_name !== undefined) updates.first_name = body.first_name;
    if (body.last_name !== undefined) updates.last_name = body.last_name;
    if (body.email !== undefined) updates.email = body.email?.trim() || null;
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.source !== undefined) updates.source = body.source;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.stage !== undefined && ['lead', 'quoted', 'booked', 'customer', 'churned'].includes(body.stage)) {
      updates.stage = body.stage;
    }
    updates.updated_at = new Date().toISOString();

    const { data: contact, error } = await (supabase as any)
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .eq('org_id', selectedOrgId)
      .select()
      .single();

    if (error) {
      console.error('CRM contact update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contact });
  } catch (err) {
    console.error('CRM contact update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update contact' },
      { status: 500 }
    );
  }
}
