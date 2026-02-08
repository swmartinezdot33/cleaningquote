import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { listGHLContacts } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

const emptyStats = () => NextResponse.json({ counts: {}, total: 0, recentActivities: [] });

/** GET /api/dashboard/crm/stats - GHL only: pipeline counts from GHL contacts */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ counts: {}, total: 0, recentActivities: [], locationIdRequired: true });
    if ('needsConnect' in ctx) return NextResponse.json({ counts: {}, total: 0, recentActivities: [], needsConnect: true });

    try {
      console.log('[CQ CRM stats] calling listGHLContacts', { locationId: ctx.locationId?.slice(0, 12) + '...', hasToken: !!ctx.token });
      const { contacts } = await listGHLContacts(ctx.locationId, { limit: 1000 }, { token: ctx.token, locationId: ctx.locationId });
      console.log('[CQ CRM stats] listGHLContacts OK', { count: contacts?.length ?? 0 });
      const counts: Record<string, number> = { lead: 0, quoted: 0, booked: 0, customer: 0, churned: 0 };
      for (const c of contacts) {
        const type = (c.type ?? c.stage ?? 'lead').toString().toLowerCase();
        const s = type in counts ? type : 'lead';
        counts[s]++;
      }
      return NextResponse.json({ counts, total: contacts.length, recentActivities: [] });
    } catch (err) {
      console.warn('[CQ CRM stats] listGHLContacts error', { locationId: ctx.locationId?.slice(0, 12) + '...', err: err instanceof Error ? err.message : String(err) });
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [], needsConnect: true });
    }
  } catch (err) {
    console.warn('CRM stats error:', err);
    return emptyStats();
  }
}
