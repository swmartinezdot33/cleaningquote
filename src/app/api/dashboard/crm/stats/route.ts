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

/** GET /api/dashboard/crm/stats - pipeline counts for CRM dashboard */
export async function GET(request: NextRequest) {
  try {
    const requestLocationId = getLocationIdFromRequest(request);
    if (requestLocationId) {
      try {
        const token = await getOrFetchTokenForLocation(requestLocationId);
        if (token) {
          const { contacts } = await listGHLContacts(requestLocationId, { limit: 1000 }, { token, locationId: requestLocationId });
          const counts: Record<string, number> = { lead: 0, quoted: 0, booked: 0, customer: 0, churned: 0 };
          for (const c of contacts) {
            const type = (c.type ?? c.stage ?? 'lead').toString().toLowerCase();
            const s = type in counts ? type : 'lead';
            counts[s]++;
          }
          return NextResponse.json({ counts, total: contacts.length, recentActivities: [] });
        }
      } catch (err) {
        console.warn('CRM stats: GHL token/fetch error for locationId', requestLocationId, err);
      }
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [] });
    }

    let session;
    try {
      session = await getSession();
    } catch (err) {
      console.warn('CRM stats: getSession error', err);
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [] });
    }
    if (session) {
      try {
        const credentials = await getGHLCredentials({ session });
        if (credentials.token && credentials.locationId) {
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
      } catch (err) {
        console.warn('CRM stats: session/credentials error', err);
      }
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [] });
    }

    let supabase;
    try {
      supabase = await createSupabaseServerSSR();
    } catch (err) {
      console.warn('CRM stats: Supabase init error', err);
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [] });
    }
    let user;
    try {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch (err) {
      console.warn('CRM stats: getUser error', err);
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [] });
    }

    if (!user) {
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [] });
    }

    let orgs;
    try {
      orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
    } catch (err) {
      console.warn('CRM stats: getOrgsForDashboard error', err);
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [] });
    }
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
    console.warn('CRM stats error:', err);
    return NextResponse.json({ counts: {}, total: 0, recentActivities: [] });
  }
}
