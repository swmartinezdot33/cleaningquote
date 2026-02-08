/**
 * GHL dashboard API context: locationId from user context (postMessage/iframe), token from Agency only.
 * No KV or OAuth token lookup; we always use Agency token and Agency calls.
 */

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getLocationTokenFromAgency } from '@/lib/ghl/agency';

export type GHLContextResult =
  | { locationId: string; token: string }
  | { needsConnect: true; locationId: string; reason?: string }
  | null;

/**
 * Resolve locationId + token for dashboard API calls.
 * LocationId comes from user context (postMessage/iframe → query or x-ghl-location-id or session).
 * Token comes from Agency only: getLocationTokenFromAgency(locationId, companyId). No KV.
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  try {
    const queryLocationId = request.nextUrl.searchParams.get('locationId');
    const headerLocationId = request.headers.get('x-ghl-location-id');
    const requestLocationId = queryLocationId ?? headerLocationId ?? undefined;
    const session = await getSession();

    const rawLocationId = requestLocationId ?? session?.locationId ?? null;
    const locationId = rawLocationId ? rawLocationId.trim() : null;

    if (!locationId) {
      return null;
    }

    const companyId = process.env.GHL_COMPANY_ID?.trim();
    if (!companyId) {
      return { needsConnect: true, locationId, reason: 'GHL_COMPANY_ID not set' };
    }

    const result = await getLocationTokenFromAgency(locationId, companyId, { skipStore: true });
    const token = result.success ? result.accessToken ?? null : null;

    if (token) {
      return { locationId, token };
    }

    const reason = result.error ?? 'Could not get Agency token for this location';
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
