/**
 * POST /api/ghl/iframe-context
 * Store iframe context (locationId, user data) from GHL parent and establish session.
 * When we receive user context we create a GHL session (cookie) so the user is "logged in" via GHL only.
 * See GHL_IFRAME_APP_AUTH.md.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { GHLIframeData } from '@/lib/ghl-iframe-types';
import { createSessionToken, setSessionCookie } from '@/lib/ghl/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: GHLIframeData = await request.json();
    const locationId = typeof body.locationId === 'string' ? body.locationId.trim() : (typeof body.location_id === 'string' ? body.location_id.trim() : '');
    const userId = typeof body.userId === 'string' ? body.userId.trim() : typeof body.user_id === 'string' ? body.user_id.trim() : '';
    const companyId = typeof body.companyId === 'string' ? body.companyId.trim() : typeof body.company_id === 'string' ? body.company_id.trim() : '';

    if (!locationId) {
      console.log('[CQ iframe-context] store: no locationId');
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    console.log('[CQ iframe-context] store', { locationId: locationId.slice(0, 12) + '...', hasUserId: !!userId });
    // Store in KV for reference
    try {
      const { getKV } = await import('@/lib/kv');
      const kv = getKV();
      await kv.set(`ghl:context:${locationId}`, { ...body, updatedAt: Date.now() }, { ex: 60 * 60 });
    } catch {
      // KV optional; don't fail the request
    }

    // Establish GHL session so getSession() returns this user context (no Next/Supabase login needed).
    const sessionToken = await createSessionToken({ locationId, companyId, userId });
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      success: true,
      locationId,
      message: 'Iframe context stored and session established',
    });
  } catch (error) {
    console.error('[CQ iframe-context] error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to store iframe context' },
      { status: 500 }
    );
  }
}
