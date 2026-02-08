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
  if (requestLocationId) {
    const token = await getOrFetchTokenForLocation(requestLocationId);
    if (token) return { locationId: requestLocationId, token };
    return { needsConnect: true };
  }
  const session = await getSession();
  if (session) {
    const creds = await getGHLCredentials({ session });
    if (creds.token && creds.locationId) return { locationId: creds.locationId, token: creds.token };
  }
  return null;
}
