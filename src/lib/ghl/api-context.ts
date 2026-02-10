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
import { searchLocations, getInstalledLocations, getLocationTokenFromAgency } from '@/lib/ghl/agency';

export type GHLContextResult =
  | { locationId: string; token: string }
  | { needsConnect: true; locationId: string; reason?: string }
  | null;

/**
 * Resolve locationId + location token for dashboard API calls.
 * User context (postMessage / iframe) must win: header, then query, then session. Agency fallback only when request has no locationId.
 * Step 2: locationId from x-ghl-location-id header, else locationId query param, else session; only then GET /locations/search or GET /oauth/installedLocations.
 * Step 3+4: getOrFetchTokenForLocation(locationId) → POST /oauth/locationToken when needed.
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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api-context.ts:resolveGHLContext:result', message: 'final locationId and token', data: { locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`, hasToken: !!token }, timestamp: Date.now(), hypothesisId: 'H4-H5' }) }).catch(() => {});
    // #endregion

    if (token) {
      return { locationId, token };
    }

    // Fallback: when KV has no install for this location, try Agency (Company) token to get a location token.
    // This covers sub-account locations when the app was installed as Agency and user opens from that location.
    const session = await getSession();
    const companyId = session?.companyId?.trim();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api-context.ts:resolveGHLContext:noKv', message: 'KV had no token; agency fallback check', data: { locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`, hasSession: !!session, hasCompanyId: !!companyId, companyIdPreview: companyId ? `${companyId.slice(0, 8)}..` : null }, timestamp: Date.now(), hypothesisId: 'H1-H3' }) }).catch(() => {});
    // #endregion
    if (companyId) {
      const agencyResult = await getLocationTokenFromAgency(locationId, companyId);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'api-context.ts:resolveGHLContext:agencyResult', message: 'getLocationTokenFromAgency result', data: { success: agencyResult.success, hasToken: !!(agencyResult as { accessToken?: string }).accessToken, error: agencyResult.success ? null : (agencyResult as { error?: string }).error }, timestamp: Date.now(), hypothesisId: 'H2-H3' }) }).catch(() => {});
      // #endregion
      if (agencyResult.success && agencyResult.accessToken) {
        return { locationId, token: agencyResult.accessToken };
      }
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
