/**
 * GHL-only API context — decrypt user context → locationId → token.
 * All dashboard data comes from GHL; no Supabase fallback.
 */

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getLocationTokenFromAgency } from '@/lib/ghl/agency';

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
 * Flow: get locationId from context (URL/header or session) → exchange Agency token for location token → use for GHL API (contacts, etc.).
 * No KV required; uses GHL_AGENCY_ACCESS_TOKEN + GHL_COMPANY_ID only.
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  const queryLocationId = request.nextUrl.searchParams.get('locationId');
  const headerLocationId = request.headers.get('x-ghl-location-id');
  const requestLocationId = queryLocationId ?? headerLocationId ?? undefined;
  const session = await getSession();

  // Resolve which locationId to use: request first, else session (e.g. iframe or same-tab).
  const rawLocationId = requestLocationId ?? session?.locationId ?? null;
  const locationId = rawLocationId ? rawLocationId.trim() : null;

  // #region agent log
  const trimDiff = requestLocationId != null && requestLocationId !== requestLocationId.trim();
  const requestHost = request.headers.get('host') ?? null;
  debugLog('resolveGHLContext entry', {
    requestHost,
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

  // Agency-only: exchange Agency token for location token (no KV).
  const companyId = process.env.GHL_COMPANY_ID?.trim();
  if (!companyId) {
    console.log('[CQ api-context] GHL_COMPANY_ID not set; cannot resolve token via Agency');
    return { needsConnect: true, locationId };
  }
  console.log('[CQ api-context] Resolving token via Agency for locationId', { locationIdPreview: locationId.slice(0, 8) + '..' + locationId.slice(-4) });
  const result = await getLocationTokenFromAgency(locationId, companyId, { skipStore: true });
  const token = result.success ? result.accessToken ?? null : null;
  console.log('[CQ api-context] Agency token result', { gotToken: !!token, locationIdPreview: locationId.slice(0, 8) + '..' + locationId.slice(-4), error: result.error ?? null });
  // #region agent log
  debugLog('after getLocationTokenFromAgency', {
    requestHost: request.headers.get('host') ?? null,
    locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
    gotToken: !!token,
    hypothesisId: 'H2-H3',
  });
  // #endregion

  if (token) {
    console.log('[CQ api-context] resolved: locationId → token (Agency)');
    return { locationId, token };
  }

  // Agency not configured or location not under this agency → needs connect.
  console.log('[CQ api-context] needsConnect: no token from Agency', { requestHost: request.headers.get('host') ?? null, locationIdPreview: locationId.slice(0, 8) + '..' + locationId.slice(-4), error: result.error ?? null });
  // #region agent log
  debugLog('needsConnect: Agency returned no token', {
    requestHost: request.headers.get('host') ?? null,
    locationIdPreview: `${locationId.slice(0, 8)}..${locationId.slice(-4)}`,
    error: result.error ?? null,
    hypothesisId: 'H1-H3',
  });
  // #endregion
  return { needsConnect: true, locationId };
}
