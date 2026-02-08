import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { listGHLContacts } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

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
      return NextResponse.json({
        ok: false,
        hasToken: false,
        hasLocationId: !!locationIdParam,
        ghlCallOk: false,
        reason: 'needs_connect',
        message: 'Location not connected. Complete OAuth for this location.',
      });
    }
    // We have token + locationId; verify with a minimal GHL API call (same as CRM)
    try {
      const { contacts } = await listGHLContacts(
        ctx.locationId,
        { limit: 1 },
        { token: ctx.token, locationId: ctx.locationId }
      );
      return NextResponse.json({
        ok: true,
        hasToken: true,
        hasLocationId: true,
        ghlCallOk: true,
        locationId: ctx.locationId,
        message: 'Token and GHL API OK. Connection verified.',
        contactsSample: Array.isArray(contacts) ? contacts.length : 0,
      });
    } catch (ghlErr) {
      const msg = ghlErr instanceof Error ? ghlErr.message : String(ghlErr);
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
