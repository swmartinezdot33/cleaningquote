/**
 * GHL dashboard API context.
 *
 * Flow (strict iframe + location-only):
 * 1. Resolve locationId from header (x-ghl-location-id), then query (locationId), then session only. No agency/search fallback.
 * 2. Get location token from KV only (from OAuth callback / Connect step for that location).
 * 3. Use that token for all GHL API calls for the location.
 */

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';

export type GHLContextResult =
  | { locationId: string; token: string }
  | { needsConnect: true; locationId: string; reason?: string }
  | null;

/**
 * Resolve locationId + location token for dashboard API calls.
 * Single source of truth for "is this location authed in KV?" — use this for any route that calls GHL API.
 * - LocationId: header (x-ghl-location-id), then query (locationId), then session only. No search/installedLocations fallback (strict iframe + location-only).
 * - Client must send user context (effectiveLocationId) via useDashboardApi() so header/query are set.
 * - Token: KV only via getOrFetchTokenForLocation(locationId). If KV has no install, returns needsConnect.
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  try {
    const headerLocationId = request.headers.get('x-ghl-location-id')?.trim() || null;
    const queryLocationId = request.nextUrl.searchParams.get('locationId')?.trim() || null;
    const session = await getSession();
    const rawLocationId = headerLocationId ?? queryLocationId ?? session?.locationId ?? null;
    const locationId = rawLocationId ? rawLocationId.trim() : null;

    if (!locationId) {
      return null;
    }

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
