import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { getLocationIdFromRequest } from '@/lib/request-utils';
import { listGHLContacts } from '@/lib/ghl/client';
import { getInstallation } from '@/lib/ghl/token-store';

export const dynamic = 'force-dynamic';

// #region agent log
function debugLog(message: string, data: Record<string, unknown>) {
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: 'verify/route.ts', message, data, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

/**
 * GET /api/dashboard/ghl/verify?locationId=...
 * Verifies we have user context (locationId + token) and can call the GHL API.
 * Use for testing and for UI to show connection status.
 */
export async function GET(request: NextRequest) {
  const locationIdParam = request.nextUrl.searchParams.get('locationId');
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) {
      return NextResponse.json({
        ok: false,
        hasToken: false,
        hasLocationId: !!locationIdParam,
        ghlCallOk: false,
        reason: 'no_context',
        message: 'No locationId in request and no session. Add ?locationId=... or sign in.',
      });
    }
    if ('needsConnect' in ctx) {
      // No token in KV for this location (primary lookup only). One reason, one message.
      const requestLocationId = getLocationIdFromRequest(request);
      const message =
        requestLocationId
          ? 'This location is not connected yet. Click below to authorize CleanQuote for this location.'
          : 'Location not connected. Complete OAuth for this location.';
      return NextResponse.json({
        ok: false,
        hasToken: false,
        hasLocationId: !!locationIdParam,
        ghlCallOk: false,
        reason: 'needs_connect',
        message,
      });
    }
    // We have token + locationId (from KV lookup by locationId); verify with a minimal GHL API call (same as CRM)
    // #region agent log
    debugLog('verify: about to call GHL listGHLContacts', {
      locationIdPreview: `${ctx.locationId.slice(0, 8)}..${ctx.locationId.slice(-4)}`,
      tokenLength: ctx.token?.length ?? 0,
      hypothesisId: 'H1-H4-H5',
    });
    // #endregion
    try {
      const [install, { contacts }] = await Promise.all([
        getInstallation(ctx.locationId),
        listGHLContacts(ctx.locationId, { limit: 1 }, { token: ctx.token, locationId: ctx.locationId }),
      ]);
      return NextResponse.json({
        ok: true,
        hasToken: true,
        hasLocationId: true,
        ghlCallOk: true,
        locationId: ctx.locationId,
        companyName: install?.companyName ?? undefined,
        message: 'Token and GHL API OK. Connection verified.',
        contactsSample: Array.isArray(contacts) ? contacts.length : 0,
      });
    } catch (ghlErr) {
      const msg = ghlErr instanceof Error ? ghlErr.message : String(ghlErr);
      // #region agent log
      debugLog('verify: GHL call failed (listGHLContacts or getInstallation)', {
        message: msg,
        hasAuthClassInMessage: msg.includes('authClass') || msg.includes('scope'),
        hypothesisId: 'H1-H5',
      });
      // #endregion
      return NextResponse.json({
        ok: false,
        hasToken: true,
        hasLocationId: true,
        ghlCallOk: false,
        locationId: ctx.locationId,
        reason: 'ghl_api_error',
        message: msg,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      hasToken: false,
      hasLocationId: !!locationIdParam,
      ghlCallOk: false,
      reason: 'error',
      message: msg,
    });
  }
}
