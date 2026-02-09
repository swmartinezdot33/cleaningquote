/**
 * GHL dashboard API context.
 *
 * Flow (simple):
 * 1. We have the access token (from OAuth callback, stored in KV).
 * 2. Resolve locationId: header, else GET /locations/search (companyId), else GET /oauth/installedLocations, else query/session.
 * 3. Get location access token from agency token → POST /oauth/locationToken.
 * 4. Use the location access token for all calls: contacts, location objects, etc. Never use the company token for those.
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
 * Step 2: locationId from header, else GET /oauth/installedLocations (with access token), else query/session.
 * Step 3+4: getOrFetchTokenForLocation(locationId) → POST /oauth/locationToken when needed, returns location token; we use that for contacts etc.
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  try {
    const headerLocationId = request.headers.get('x-ghl-location-id')?.trim() || null;
    let rawLocationId: string | null = headerLocationId;

    if (!rawLocationId) {
      // Prefer GET /locations/search (Search Sub-Account) — scope locations.readonly, Agency token + companyId
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

    if (!rawLocationId) {
      const queryLocationId = request.nextUrl.searchParams.get('locationId')?.trim() || null;
      const session = await getSession();
      rawLocationId = queryLocationId ?? session?.locationId ?? null;
    }

    const locationId = rawLocationId ? rawLocationId.trim() : null;

    if (!locationId) {
      return null;
    }

    // Step 3+4: get location access token (POST /oauth/locationToken with our access token), then use it for all GHL calls.
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
