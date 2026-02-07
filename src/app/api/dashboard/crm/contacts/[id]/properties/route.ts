import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/crm/contacts/[id]/properties */
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

    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', id)
      .eq('org_id', selectedOrgId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .eq('contact_id', id)
      .eq('org_id', selectedOrgId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ properties: properties ?? [] });
  } catch (err) {
    console.error('CRM properties list error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch properties' },
      { status: 500 }
    );
  }
}

/** POST /api/dashboard/crm/contacts/[id]/properties */
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

    const { data: contact } = await supabase
      .from('contacts')
      .select('id')
      .eq('id', id)
      .eq('org_id', selectedOrgId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const body = await request.json();
    const { address, city, state, postal_code, country, nickname } = body;

    const { data: property, error } = await (supabase as any)
      .from('properties')
      .insert({
        contact_id: id,
        org_id: selectedOrgId,
        address: address ?? null,
        city: city ?? null,
        state: state ?? null,
        postal_code: postal_code ?? null,
        country: country ?? null,
        nickname: nickname ?? null,
        stage: 'lead',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ property });
  } catch (err) {
    console.error('CRM property create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create property' },
      { status: 500 }
    );
  }
}
