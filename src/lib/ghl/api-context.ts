/**
 * GHL-only API context — decrypt user context → locationId → token.
 * All dashboard data comes from GHL; no Supabase fallback.
 */

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';

export type GHLContextResult =
  | { locationId: string; token: string }
  | { needsConnect: true; locationId: string; reason?: string }
  | null;

/**
 * Resolve locationId + token for dashboard API calls.
 * We assume every install is under our agency; no OAuth "connect" prompt.
 * Flow: locationId from context (URL/header or session) → KV (stored on install) or Agency → token.
 * New installations store token+locationId in KV via OAuth callback; dashboard uses KV first, then Agency.
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  try {
    const queryLocationId = request.nextUrl.searchParams.get('locationId');
    const headerLocationId = request.headers.get('x-ghl-location-id');
    const requestLocationId = queryLocationId ?? headerLocationId ?? undefined;
    const session = await getSession();

    const rawLocationId = requestLocationId ?? session?.locationId ?? null;
    const locationId = rawLocationId ? rawLocationId.trim() : null;

    console.log('[CQ api-context] resolveGHLContext', {
      hasLocationId: !!locationId,
      source: queryLocationId != null ? 'query' : headerLocationId != null ? 'header' : session?.locationId ? 'session' : 'none',
    });

    if (!locationId) {
      return null;
    }

    // KV first (from install callback), then Agency; Agency stores to KV so next request hits KV.
    const token = await getOrFetchTokenForLocation(locationId);

    if (token) {
      return { locationId, token };
    }

    // No token in KV and Agency didn't return one (e.g. env missing, or location not under agency).
    const companyId = process.env.GHL_COMPANY_ID?.trim();
    const agencyToken = process.env.GHL_AGENCY_ACCESS_TOKEN?.trim();
    const reason = !companyId
      ? 'GHL_COMPANY_ID not set'
      : !agencyToken
        ? 'GHL_AGENCY_ACCESS_TOKEN not set'
        : 'Could not get token for this location (check Agency access or KV)';
    console.log('[CQ api-context] no token', { locationIdPreview: locationId.slice(0, 8) + '..' + locationId.slice(-4), reason });
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
