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
 * LocationId: header, then query, then session; if none, GET /locations/search or GET /oauth/installedLocations.
 * Token: KV only via getOrFetchTokenForLocation(locationId). No agency fallback; if KV has no install, returns needsConnect.
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  try {
    const headerLocationId = request.headers.get('x-ghl-location-id')?.trim() || null;
    const queryLocationId = request.nextUrl.searchParams.get('locationId')?.trim() || null;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api-context.ts:resolveGHLContext:entry', message: 'resolveGHLContext entry', data: { headerLocationId: headerLocationId ? `${headerLocationId.slice(0, 8)}..` : null, queryLocationId: queryLocationId ? `${queryLocationId.slice(0, 8)}..` : null }, timestamp: Date.now(), hypothesisId: 'H1-H2-H3' }) }).catch(() => {});
    // #endregion

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api-context.ts:resolveGHLContext:noToken', message: 'returning needsConnect (no token in KV)', data: { locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}` }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {});
    // #endregion
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
