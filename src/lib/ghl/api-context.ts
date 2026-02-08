/**
 * GHL dashboard API context: locationId from user context (postMessage/iframe), or GET /oauth/installedLocations when no cookie/session.
 * Token from KV (install flow) or Agency. We prefer GET /oauth/installedLocations over relying on cookie for locationId.
 */

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';
import { getInstalledLocations } from '@/lib/ghl/agency';

export type GHLContextResult =
  | { locationId: string; token: string }
  | { needsConnect: true; locationId: string; reason?: string }
  | null;

/**
 * Resolve locationId + token for dashboard API calls.
 * LocationId: x-ghl-location-id header first, then GET /oauth/installedLocations; query param and session (cookie) are last.
 * Token: KV first (stored when location completes Connect or from Get Location Access Token), then Agency.
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  try {
    const headerLocationId = request.headers.get('x-ghl-location-id')?.trim() || null;
    let rawLocationId: string | null = headerLocationId;

    if (!rawLocationId) {
      const installed = await getInstalledLocations();
      if (installed.success && installed.locations?.length) {
        const first = installed.locations[0];
        rawLocationId = (first?._id ?? first?.id ?? (first as { locationId?: string }).locationId) ?? null;
      }
    }

    if (!rawLocationId) {
      const queryLocationId = request.nextUrl.searchParams.get('locationId')?.trim() || null;
      const session = await getSession();
      rawLocationId = queryLocationId ?? session?.locationId ?? null;
    }

    const locationId = rawLocationId ? rawLocationId.trim() : null;

    if (!locationId) {
      return null;
    }

    // KV first (from install/Connect), then Agency (needs oauth.write — not exposed in all Marketplace scope UIs).
    const token = await getOrFetchTokenForLocation(locationId);

    if (token) {
      return { locationId, token };
    }

    const reason =
      'Connect this location once: open CleanQuote from this location in GHL and complete the Connect step. We store the token in KV (no oauth scope needed).';
    return { needsConnect: true, locationId, reason };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CQ api-context] resolveGHLContext threw', { err: msg });
    const queryLocationId = request.nextUrl.searchParams.get('locationId');
    const headerLocationId = request.headers.get('x-ghl-location-id');
    const locationId = (queryLocationId ?? headerLocationId ?? '').trim() || null;
    if (locationId) return { needsConnect: true, locationId, reason: msg };
    return null;
  }
}
