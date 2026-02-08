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

/**
 * Resolve locationId + token from:
 * 1. Request (query locationId or x-ghl-location-id header) — client passes from decrypted GHL context
 * 2. OAuth session cookie (from previous install)
 * Returns null when no context (locationIdRequired).
 */
export async function resolveGHLContext(request: NextRequest): Promise<GHLContextResult> {
  const requestLocationId = getLocationIdFromRequest(request);
  const session = await getSession();

  console.log('[CQ api-context] resolveGHLContext', {
    requestLocationId: requestLocationId ?? null,
    hasSession: !!session,
    sessionLocationId: session?.locationId ? session.locationId.slice(0, 12) + '...' : null,
  });

  if (requestLocationId) {
    const token = await getOrFetchTokenForLocation(requestLocationId);
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
