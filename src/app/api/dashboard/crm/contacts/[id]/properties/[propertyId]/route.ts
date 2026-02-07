import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** PATCH /api/dashboard/crm/contacts/[id]/properties/[propertyId] */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; propertyId: string }> }
) {
  try {
    const { id, propertyId } = await params;
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
      .eq('id', propertyId)
      .eq('contact_id', id)
      .eq('org_id', selectedOrgId)
      .single();

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.address !== undefined) updates.address = body.address;
    if (body.city !== undefined) updates.city = body.city;
    if (body.state !== undefined) updates.state = body.state;
    if (body.postal_code !== undefined) updates.postal_code = body.postal_code;
    if (body.country !== undefined) updates.country = body.country;
    if (body.nickname !== undefined) updates.nickname = body.nickname;
    if (body.stage !== undefined && ['lead', 'quoted', 'booked', 'customer', 'churned'].includes(body.stage)) {
      updates.stage = body.stage;
    }

    const { data: updated, error } = await (supabase as any)
      .from('properties')
      .update(updates)
      .eq('id', propertyId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ property: updated });
  } catch (err) {
    console.error('CRM property update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update property' },
      { status: 500 }
    );
  }
}
