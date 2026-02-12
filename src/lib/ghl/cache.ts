/**
 * In-memory GET cache for GHL API responses.
 * Key = locationId + method + path + sorted query string.
 * Only GET and 2xx responses are cached. Process-local only; no persistence.
 */

export interface CacheEntry<T = unknown> {
  data: T;
  status: number;
  cachedAt: number;
  headers?: Record<string, string>;
}

const DEFAULT_TTL_MS = 60_000; // 60 seconds

let cache = new Map<string, CacheEntry>();
let ttlMs = DEFAULT_TTL_MS;

/**
 * Build cache key from request components.
 */
export function buildCacheKey(
  locationId: string,
  method: string,
  path: string,
  query?: Record<string, string> | URLSearchParams
): string {
  const q = query instanceof URLSearchParams
    ? Object.fromEntries(query.entries())
    : query ?? {};
  const sorted = Object.keys(q)
    .sort()
    .map((k) => `${k}=${q[k]}`)
    .join('&');
  return `${locationId}:${method}:${path}:${sorted}`;
}

/**
 * Get cached response if present and not expired.
 */
export function getCached<T>(key: string): CacheEntry<T> | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry;
}

/**
 * Store response in cache. Only call for GET and 2xx.
 */
export function setCached<T>(
  key: string,
  data: T,
  status: number,
  headers?: Record<string, string>
): void {
  if (status < 200 || status >= 300) return;
  cache.set(key, {
    data,
    status,
    cachedAt: Date.now(),
    headers,
  });
}

/**
 * Invalidate all cache entries for a location (e.g. after 401/403 or token refresh failure).
 */
export function clearForLocation(locationId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${locationId}:`)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear entire cache (e.g. for tests).
 */
export function clearAll(): void {
  cache = new Map();
}

/**
 * Configure TTL in milliseconds. Default 60000.
 */
export function setTTL(ms: number): void {
  ttlMs = ms;
}

export function getTTL(): number {
  return ttlMs;
}
