/**
 * POST /api/ghl/iframe-context
 * Store iframe context (location ID, user data) from GHL parent — matches MaidCentral.
 * Client calls this when context is resolved (URL, referrer, postMessage, etc.).
 */

import { NextRequest, NextResponse } from 'next/server';
import type { GHLIframeData } from '@/lib/ghl-iframe-types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: GHLIframeData = await request.json();
    const { locationId } = body;

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required' },
        { status: 400 }
      );
    }

    // Context is primarily used client-side (sessionStorage + passed to APIs).
    // POST ack allows client behavior to match MaidCentral; we optionally
    // store in KV for debugging/future use.
    try {
      const { getKV } = await import('@/lib/kv');
      const kv = getKV();
      await kv.set(`ghl:context:${locationId}`, { ...body, updatedAt: Date.now() }, { ex: 60 * 60 });
    } catch {
      // KV optional; don't fail the request
    }

    return NextResponse.json({
      success: true,
      locationId,
      message: 'Iframe context stored successfully',
    });
  } catch (error) {
    console.error('Error storing iframe context:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to store iframe context' },
      { status: 500 }
    );
  }
}
