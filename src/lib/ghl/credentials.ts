/**
 * Resolve GHL credentials from session (OAuth token store) or config (legacy).
 * Use this in API routes to get token + locationId for GHL API calls.
 */

import { getTokenForLocation } from '@/lib/ghl/token-store';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import type { GHLSession } from '@/lib/ghl/session';

export interface GHLCredentials {
  token: string | null;
  locationId: string | null;
}

/**
 * Get GHL token and locationId.
 * When session is provided (from OAuth install), uses token store.
 * Otherwise falls back to config (Supabase-backed) by toolId.
 */
export async function getGHLCredentials(options?: {
  session?: GHLSession | null;
  toolId?: string;
}): Promise<GHLCredentials> {
  if (options?.session?.locationId) {
    const token = await getTokenForLocation(options.session.locationId);
    return {
      token,
      locationId: token ? options.session.locationId : null,
    };
  }
  const [token, locationId] = await Promise.all([
    getGHLToken(options?.toolId).catch(() => null),
    getGHLLocationId(options?.toolId).catch(() => null),
  ]);
  return { token, locationId };
}
