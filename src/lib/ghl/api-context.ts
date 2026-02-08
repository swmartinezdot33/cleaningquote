/**
 * GHL-only API context — decrypt user context → locationId → token.
 * All dashboard data comes from GHL; no Supabase fallback.
 */

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getTokenForLocation } from '@/lib/ghl/token-store';
import { getLocationIdFromRequest } from '@/lib/request-utils';

export type GHLContextResult =
  | { locationId: string; token: string }
  | { needsConnect: true; locationId: string }
  | null;

// #region agent log
function debugLog(message: string, data: Record<string, unknown>) {
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: 'api-context.ts', message, data, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

/**
 * Resolve locationId + token for dashboard API calls.
 * We do NOT compare locationId to anything — it is only the key for KV lookup.
 * Flow: get locationId from page (URL/header or session) → look up in KV → return token or needsConnect.
 * Token is always from KV (stored at OAuth callback); no Agency or other fallback.
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  const queryLocationId = request.nextUrl.searchParams.get('locationId');
  const headerLocationId = request.headers.get('x-ghl-location-id');
  const requestLocationId = queryLocationId ?? headerLocationId ?? undefined;
  const session = await getSession();

  // Resolve which locationId to use: request first, else session (e.g. same-tab after OAuth). Normalize so KV lookup matches callback storage.
  const rawLocationId = requestLocationId ?? session?.locationId ?? null;
  const locationId = rawLocationId ? rawLocationId.trim() : null;

  // #region agent log
  const trimDiff = requestLocationId != null && requestLocationId !== requestLocationId.trim();
  debugLog('resolveGHLContext entry', {
    source: queryLocationId != null ? 'query' : headerLocationId != null ? 'header' : 'none',
    requestLocationIdLength: requestLocationId?.length ?? 0,
    requestLocationIdPreview: requestLocationId ? `${requestLocationId.slice(0, 8)}..${requestLocationId.slice(-4)}` : null,
    trimDiff,
    locationIdSource: requestLocationId != null ? 'request' : session?.locationId != null ? 'session' : 'none',
    hasSession: !!session,
    sessionLocationIdPreview: session?.locationId ? `${session.locationId.slice(0, 8)}..${session.locationId.slice(-4)}` : null,
    locationIdPreview: locationId ? `${locationId.slice(0, 8)}..${locationId.slice(-4)}` : null,
    hypothesisId: 'H1-H5',
  });
  // #endregion

  console.log('[CQ api-context] resolveGHLContext', {
    requestLocationId: requestLocationId ?? null,
    hasSession: !!session,
    locationId: locationId ? locationId.slice(0, 12) + '...' : null,
  });

  if (!locationId) {
    console.log('[CQ api-context] no locationId in request and no session');
    return null;
  }

  // Primary lookup only: locationId → KV (find location in storage) → return token for calls. No fallback.
  const token = await getTokenForLocation(locationId);
  // #region agent log
  debugLog('after getTokenForLocation (KV only)', {
    locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
    gotToken: !!token,
    hypothesisId: 'H2-H3',
  });
  // #endregion

  if (token) {
    console.log('[CQ api-context] resolved: locationId → KV → token');
    return { locationId, token };
  }

  // No token in KV for this location → needs one-time OAuth (callback will store to KV).
  console.log('[CQ api-context] needsConnect: no token in KV for this location');
  return { needsConnect: true, locationId };
}
