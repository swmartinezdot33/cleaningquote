/**
 * Cache GHL current user info per location+user so we can reference it without calling GHL every time.
 * KV key: ghl:user:{locationId}:{userId} with TTL 1 hour.
 */

import { getKV } from '@/lib/kv';
import { getTokenForLocation } from '@/lib/ghl/token-store';
import { getGHLUser } from '@/lib/ghl/client';
import type { GHLUserInfo } from '@/lib/ghl/types';

const CACHE_PREFIX = 'ghl:user:';
const CACHE_TTL_SEC = 60 * 60; // 1 hour

export type CachedGHLUser = GHLUserInfo;

function cacheKey(locationId: string, userId: string): string {
  return `${CACHE_PREFIX}${locationId}:${userId}`;
}

/**
 * Get cached user if present.
 */
export async function getCachedUser(locationId: string, userId: string): Promise<CachedGHLUser | null> {
  if (!locationId || !userId) return null;
  try {
    const kv = getKV();
    const cached = await kv.get<CachedGHLUser>(cacheKey(locationId, userId));
    return cached ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch current user from GHL, store in cache, and return. Returns null if fetch fails.
 */
export async function getOrFetchCurrentUser(locationId: string, userId: string): Promise<CachedGHLUser | null> {
  if (!locationId || !userId) return null;

  const cached = await getCachedUser(locationId, userId);
  if (cached) return cached;

  const token = await getTokenForLocation(locationId);
  if (!token) return null;

  const user = await getGHLUser(userId, token, locationId);
  if (!user) return null;

  try {
    const kv = getKV();
    await kv.set(cacheKey(locationId, userId), user, { ex: CACHE_TTL_SEC });
  } catch {
    // non-fatal
  }
  return user;
}
