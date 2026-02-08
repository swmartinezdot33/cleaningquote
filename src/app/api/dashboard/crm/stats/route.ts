import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard } from '@/lib/org-auth';
import { getSession } from '@/lib/ghl/session';
import { getGHLCredentials } from '@/lib/ghl/credentials';
import { listGHLContacts } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/crm/stats - pipeline counts for CRM dashboard */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (session) {
      const credentials = await getGHLCredentials({ session });
      if (!credentials.token || !credentials.locationId) {
        return NextResponse.json({ counts: {}, total: 0, recentActivities: [] });
      }
      const { contacts } = await listGHLContacts(credentials.locationId, { limit: 1000 }, credentials);
      const counts: Record<string, number> = {
        lead: 0,
        quoted: 0,
        booked: 0,
        customer: 0,
        churned: 0,
      };
      for (const c of contacts) {
        const type = (c.type ?? c.stage ?? 'lead').toString().toLowerCase();
        const s = type in counts ? type : 'lead';
        counts[s]++;
      }
      return NextResponse.json({
        counts,
        total: contacts.length,
        recentActivities: [],
      });
    }

    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
    const cookieStore = await cookies();
    const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id;

    if (!selectedOrgId) {
      return NextResponse.json({ counts: {}, recentActivities: [] });
    }

    const { data: contacts } = await (supabase as any)
      .from('contacts')
      .select('stage')
      .eq('org_id', selectedOrgId);

    const counts: Record<string, number> = {
      lead: 0,
      quoted: 0,
      booked: 0,
      customer: 0,
      churned: 0,
    };

    for (const c of contacts ?? []) {
      const s = c.stage as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    const { data: recentActivities } = await (supabase as any)
      .from('activities')
      .select('id, contact_id, type, title, created_at')
      .eq('org_id', selectedOrgId)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      counts,
      total: (contacts ?? []).length,
      recentActivities: recentActivities ?? [],
    });
  } catch (err) {
    console.error('CRM stats error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
