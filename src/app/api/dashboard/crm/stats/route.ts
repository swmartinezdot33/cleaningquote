import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { getContacts } from '@/lib/ghl/ghl-client';

export const dynamic = 'force-dynamic';

const emptyStats = () => NextResponse.json({ counts: {}, total: 0, recentActivities: [] });

/** GET /api/dashboard/crm/stats - GHL only: pipeline counts from GHL contacts */
export async function GET(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'crm/stats/route.ts:GET',message:'stats GET entry',data:{hypothesisId:'H1_H2'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'crm/stats/route.ts',message:'stats branch ctx null',data:{status:200,hypothesisId:'H4'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [], locationIdRequired: true });
    }
    if ('needsConnect' in ctx) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'crm/stats/route.ts',message:'stats branch needsConnect',data:{status:200,hypothesisId:'H4'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ counts: {}, total: 0, recentActivities: [], needsConnect: true });
    }

    // GHL contacts API rejects limit > 100 (e.g. "limit must not be greater than 100")
    const result = await getContacts(ctx.locationId, { token: ctx.token, locationId: ctx.locationId }, { limit: 100 });
    if (!result.ok) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'crm/stats/route.ts',message:'stats branch result not ok',data:{status:200,errorMsg:(result as {error?:{message?:string}}).error?.message?.slice(0,80),hypothesisId:'H1'},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
      console.warn('[CQ CRM stats] GHL getContacts failed', { locationId: ctx.locationId?.slice(0, 12), error: result.error.message });
      return NextResponse.json({
        counts: {},
        total: 0,
        recentActivities: [],
        apiError: true,
        error: result.error.message,
      });
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'crm/stats/route.ts',message:'stats branch success',data:{status:200,contactsLen:result.data?.contacts?.length,hypothesisId:'H1'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const contacts = result.data.contacts;
    const counts: Record<string, number> = { lead: 0, quoted: 0, booked: 0, customer: 0, churned: 0 };
    for (const c of contacts) {
      const type = (c.type ?? c.stage ?? 'lead').toString().toLowerCase();
      const s = type in counts ? type : 'lead';
      counts[s]++;
    }
    return NextResponse.json({ counts, total: contacts.length, recentActivities: [] });
  } catch (err) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'crm/stats/route.ts',message:'stats catch',data:{status:200,errMsg:err instanceof Error ? err.message : String(err).slice(0,80),hypothesisId:'H2'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    console.warn('CRM stats error:', err);
    return emptyStats();
  }
}
