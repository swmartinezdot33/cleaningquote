import { NextRequest, NextResponse } from 'next/server';
import { getLocationTokenFromAgency } from '@/lib/ghl/agency';

export const dynamic = 'force-dynamic';

/**
 * GHL Marketplace App Install Webhook
 * When CleanQuote is auto-installed for a sub-account, GHL sends an INSTALL event.
 * We exchange our Agency token for a Location token and store it so the iframe flow
 * can look up tokens by locationId and fetch GHL data.
 *
 * Configure webhook URL in GHL Marketplace → Your App → Webhooks.
 * Must match exactly: https://yourdomain.com/api/webhooks/ghl
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const eventType = body.type as string | undefined;
    const locationId = (body.locationId ?? body.location_id ?? '').toString().trim();
    const companyId = ((body.companyId ?? body.company_id ?? process.env.GHL_COMPANY_ID) ?? '').toString().trim();

    if (eventType === 'INSTALL' && locationId && companyId) {
      const result = await getLocationTokenFromAgency(locationId, companyId);
      if (result.success) {
        console.log('GHL webhook: INSTALL – Location token stored', { locationId });
        return NextResponse.json({ received: true, stored: true });
      }
      console.warn('GHL webhook: INSTALL – Token fetch failed', { locationId, error: result.error });
    }

    // UNINSTALL or other events – acknowledge, no action needed
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('GHL webhook error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook failed' },
      { status: 500 }
    );
  }
}
