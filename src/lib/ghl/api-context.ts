/**
 * GHL-only API context — decrypt user context → locationId → token.
 * All dashboard data comes from GHL; no Supabase fallback.
 */

import { NextRequest } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getGHLCredentials } from '@/lib/ghl/credentials';
import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';
import { getLocationIdFromRequest } from '@/lib/request-utils';

export type GHLContextResult =
  | { locationId: string; token: string }
  | { needsConnect: true }
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
 * Resolve locationId + token from:
 * 1. Request (query locationId or x-ghl-location-id header) — client passes from decrypted GHL context
 * 2. OAuth session cookie (from previous install)
 * Returns null when no context (locationIdRequired).
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  const requestLocationId = getLocationIdFromRequest(request);
  const session = await getSession();

  // #region agent log
  debugLog('resolveGHLContext entry', {
    requestLocationIdLength: requestLocationId?.length ?? 0,
    requestLocationIdPreview: requestLocationId ? `${requestLocationId.slice(0, 8)}..${requestLocationId.slice(-4)}` : null,
    hasSession: !!session,
    sessionLocationIdPreview: session?.locationId ? `${session.locationId.slice(0, 8)}..${session.locationId.slice(-4)}` : null,
    sessionMatchesRequest: !!(requestLocationId && session?.locationId === requestLocationId),
    hypothesisId: 'H1-H4',
  });
  // #endregion

  console.log('[CQ api-context] resolveGHLContext', {
    requestLocationId: requestLocationId ?? null,
    hasSession: !!session,
    sessionLocationId: session?.locationId ? session.locationId.slice(0, 12) + '...' : null,
  });

  if (requestLocationId) {
    const token = await getOrFetchTokenForLocation(requestLocationId);
    // #region agent log
    debugLog('after getOrFetchTokenForLocation', {
      requestLocationIdPreview: `${requestLocationId.slice(0, 8)}..${requestLocationId.slice(-4)}`,
      gotToken: !!token,
      hypothesisId: 'H2-H3',
    });
    // #endregion
    if (token) {
      console.log('[CQ api-context] resolved from request locationId + KV token');
      return { locationId: requestLocationId, token };
    }
    // Client sent locationId but KV has no token — try session path (same locationId, cookie may have been set by callback)
    if (session?.locationId && session.locationId === requestLocationId) {
      const creds = await getGHLCredentials({ session });
      if (creds.token && creds.locationId) {
        console.log('[CQ api-context] resolved from session fallback (same locationId)');
        return { locationId: creds.locationId, token: creds.token };
      }
    }
    // #region agent log
    debugLog('needsConnect: no token from KV, no session fallback', {
      requestLocationIdPreview: `${requestLocationId.slice(0, 8)}..${requestLocationId.slice(-4)}`,
      hadSession: !!session,
      sessionLocationIdPreview: session?.locationId ? `${session.locationId.slice(0, 8)}..${session.locationId.slice(-4)}` : null,
      hypothesisId: 'H1-H2-H4',
    });
    // #endregion
    console.log('[CQ api-context] needsConnect: locationId present but no token in KV and no session fallback');
    return { needsConnect: true };
  }

  if (session) {
    const creds = await getGHLCredentials({ session });
    if (creds.token && creds.locationId) {
      console.log('[CQ api-context] resolved from session cookie');
      return { locationId: creds.locationId, token: creds.token };
    }
    console.log('[CQ api-context] session present but getGHLCredentials returned no token');
  } else {
    console.log('[CQ api-context] no request locationId and no session');
  }
  return null;
}
