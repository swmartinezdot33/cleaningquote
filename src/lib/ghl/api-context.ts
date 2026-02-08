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
    const hasAgencyToken = !!(process.env.GHL_AGENCY_ACCESS_TOKEN?.trim());
    console.log('[CQ api-context] env check', { hasCompanyId: !!companyId, hasAgencyToken });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'api-context.ts',
        message: 'resolveGHLContext before Agency',
        data: { hasCompanyId: !!companyId, hasAgencyToken, hypothesisId: 'H2-H4' },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!companyId) {
      return { needsConnect: true, locationId, reason: 'GHL_COMPANY_ID not set' };
    }

    const result = await getLocationTokenFromAgency(locationId, companyId, { skipStore: true });
    const token = result.success ? result.accessToken ?? null : null;
    console.log('[CQ api-context] Agency result', { gotToken: !!token, errorPreview: result.error ? result.error.slice(0, 100) : null });

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'api-context.ts',
        message: 'resolveGHLContext after Agency',
        data: { gotToken: !!token, errorPreview: result.error ? result.error.slice(0, 80) : null, hypothesisId: 'H1-H3-H5' },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
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
