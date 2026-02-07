import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/crm/properties/[id]/schedules */
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
    const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;

    if (!selectedOrgId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    const { data: property } = await supabase
      .from('properties')
      .select('id')
      .eq('id', id)
      .eq('org_id', selectedOrgId)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const { data: schedules, error } = await supabase
      .from('service_schedules')
      .select('*')
      .eq('property_id', id)
      .eq('org_id', selectedOrgId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ schedules: schedules ?? [] });
  } catch (err) {
    console.error('CRM schedules list error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch schedules' },
      { status: 500 }
    );
  }
}

/** POST /api/dashboard/crm/properties/[id]/schedules */
export async function POST(
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
    const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;

    if (!selectedOrgId) {
      return NextResponse.json({ error: 'No organization selected' }, { status: 400 });
    }

    const { data: property } = await supabase
      .from('properties')
      .select('id, contact_id')
      .eq('id', id)
      .eq('org_id', selectedOrgId)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const body = await request.json();
    const { frequency, preferred_day, preferred_time_slot, price_per_visit, start_date } = body;

    if (!frequency || !['weekly', 'biweekly', 'four_week'].includes(frequency)) {
      return NextResponse.json({ error: 'Valid frequency (weekly, biweekly, four_week) is required' }, { status: 400 });
    }

    const { data: schedule, error } = await (supabase as any)
      .from('service_schedules')
      .insert({
        property_id: id,
        org_id: selectedOrgId,
        frequency,
        preferred_day: preferred_day ?? null,
        preferred_time_slot: preferred_time_slot ?? null,
        price_per_visit: price_per_visit ?? null,
        start_date: start_date ?? null,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await (supabase as any).from('activities').insert({
      contact_id: (property as { contact_id: string }).contact_id,
      org_id: selectedOrgId,
      type: 'stage_change',
      title: 'Recurring schedule created',
      metadata: { schedule_id: schedule.id, property_id: id },
      created_by: user.id,
    });

    return NextResponse.json({ schedule });
  } catch (err) {
    console.error('CRM schedule create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create schedule' },
      { status: 500 }
    );
  }
}
