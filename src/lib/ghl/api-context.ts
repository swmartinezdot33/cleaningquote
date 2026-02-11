/**
 * GHL dashboard API context.
 *
 * Flow (simple):
 * 1. Resolve locationId: header, then query, then session; else GET /locations/search or GET /oauth/installedLocations when no locationId.
 * 2. Get location token from KV only (from OAuth callback / Connect step for that location). No agency fallback.
 * 3. Use that token for all GHL API calls for the location.
 */

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';
import { searchLocations, getInstalledLocations } from '@/lib/ghl/agency';

export type GHLContextResult =
  | { locationId: string; token: string }
  | { needsConnect: true; locationId: string; reason?: string }
  | null;

/**
 * Resolve locationId + location token for dashboard API calls.
 * Single source of truth for "is this location authed in KV?" — use this for any route that calls GHL API.
 * - LocationId: header (x-ghl-location-id), then query (locationId), then session; if none, search/installedLocations.
 * - Client must send user context (effectiveLocationId) via useDashboardApi() so header/query are set.
 * - Token: KV only via getOrFetchTokenForLocation(locationId). No agency fallback; if KV has no install, returns needsConnect.
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  try {
    const headerLocationId = request.headers.get('x-ghl-location-id')?.trim() || null;
    const queryLocationId = request.nextUrl.searchParams.get('locationId')?.trim() || null;

    // User context first: header (postMessage/snippet), then query, then session. Agency only when none provided.
    let rawLocationId: string | null = headerLocationId ?? queryLocationId;
    if (!rawLocationId) {
      const session = await getSession();
      rawLocationId = session?.locationId ?? null;
    }
    if (!rawLocationId) {
      const searched = await searchLocations({ limit: 10 });
      if (searched.success && searched.locations?.length) {
        const first = searched.locations[0];
        rawLocationId = (first?.id ?? first?._id ?? (first as { locationId?: string }).locationId) ?? null;
      }
      if (!rawLocationId) {
        const installed = await getInstalledLocations();
        if (installed.success && installed.locations?.length) {
          const first = installed.locations[0];
          rawLocationId = (first?._id ?? first?.id ?? (first as { locationId?: string }).locationId) ?? null;
        }
      }
    }

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
