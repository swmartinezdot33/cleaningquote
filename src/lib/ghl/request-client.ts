/**
 * Centralized GHL HTTP client: timeout, retries, backoff, per-location queue, optional cache.
 * Single source of truth for all GHL API requests.
 */

import type { GHLCredentials } from '@/lib/ghl/credentials';
import { fromResponse, fromError, type GHLClientError } from './errors';
import {
  buildCacheKey,
  getCached,
  setCached,
  clearForLocation,
  setTTL as setCacheTTL,
} from './cache';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

const DEFAULT_TIMEOUT_MS = 25000;
const MAX_RETRIES = 3;
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const MAX_CONCURRENT_PER_LOCATION = 8;

export type RequestResult<T> =
  | { ok: true; data: T; requestId: string }
  | { ok: false; error: GHLClientError };

export interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params?: Record<string, string>;
  body?: Record<string, unknown>;
  locationId?: string;
  credentials?: GHLCredentials | null;
  tokenOverride?: string;
  timeout?: number;
  /** Skip cache (e.g. for fresh data). Default false for GET. */
  skipCache?: boolean;
}

function getEnvTimeout(): number {
  const v = process.env.GHL_REQUEST_TIMEOUT_MS;
  if (v == null || v === '') return DEFAULT_TIMEOUT_MS;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

function getEnvCacheTTL(): number {
  const v = process.env.GHL_CACHE_TTL_SEC;
  // Default 120s (2 min) for GET cache to speed up repeat loads; override with GHL_CACHE_TTL_SEC
  if (v == null || v === '') return 120_000;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n * 1000 : 120_000;
}

const debugHeaders = (): boolean =>
  process.env.DEBUG_GHL_HEADERS === 'true' || process.env.DEBUG_GHL_HEADERS === '1';

function generateRequestId(): string {
  return `ghl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function maskLocationId(id: string | undefined): string {
  if (!id) return '(none)';
  if (id.length <= 8) return '***';
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

// Per-location concurrency: in-flight count + queue of run-next callbacks
const locationQueues = new Map<
  string,
  { running: number; queue: Array<() => void> }
>();

function getQueueKey(locationId: string | undefined): string {
  return locationId ?? '__no_location__';
}

async function acquireSlot(locationId: string | undefined): Promise<void> {
  const key = getQueueKey(locationId);
  let q = locationQueues.get(key);
  if (!q) {
    q = { running: 0, queue: [] };
    locationQueues.set(key, q);
  }
  if (q.running < MAX_CONCURRENT_PER_LOCATION) {
    q.running++;
    return;
  }
  await new Promise<void>((resolve) => {
    q!.queue.push(resolve);
  });
  q.running++;
}

function releaseSlot(locationId: string | undefined): void {
  const key = getQueueKey(locationId);
  const q = locationQueues.get(key);
  if (!q) return;
  q.running--;
  if (q.queue.length > 0) {
    const next = q.queue.shift();
    if (next) next();
  }
}

// Circuit breaker state per location (optional)
const circuitState = new Map<
  string,
  { failures: number; openUntil?: number }
>();
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_MS = 30_000;

function isCircuitOpen(locationId: string | undefined): boolean {
  const key = getQueueKey(locationId);
  const s = circuitState.get(key);
  if (!s?.openUntil) return false;
  if (Date.now() < s.openUntil) return true;
  circuitState.delete(key);
  return false;
}

function recordSuccess(locationId: string | undefined): void {
  const key = getQueueKey(locationId);
  circuitState.delete(key);
}

function recordFailure(locationId: string | undefined): void {
  const key = getQueueKey(locationId);
  let s = circuitState.get(key);
  if (!s) {
    s = { failures: 0 };
    circuitState.set(key, s);
  }
  s.failures++;
  if (s.failures >= CIRCUIT_FAILURE_THRESHOLD) {
    s.openUntil = Date.now() + CIRCUIT_OPEN_MS;
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[GHL] Circuit open for location ${maskLocationId(locationId)} for ${CIRCUIT_OPEN_MS}ms`);
    }
  }
}

// Initialize cache TTL from env once
let cacheTTLInitialized = false;
function ensureCacheTTL(): void {
  if (!cacheTTLInitialized) {
    setCacheTTL(getEnvCacheTTL());
    cacheTTLInitialized = true;
  }
}

/**
 * Invalidate cache for a location (call after 401/403 or token refresh failure).
 */
export function invalidateCacheForLocation(locationId: string): void {
  clearForLocation(locationId);
}

/**
 * Low-level request. Uses credentials or tokenOverride; no Location-Id when credentials provided.
 */
export async function request<T>(options: RequestOptions): Promise<RequestResult<T>> {
  const {
    method,
    path,
    params,
    body,
    locationId,
    credentials,
    tokenOverride,
    skipCache: explicitSkipCache,
  } = options;
  const skipCache = explicitSkipCache === true || (path && path.includes('opportunities/search'));

  const timeoutMs = options.timeout ?? getEnvTimeout();
  const requestId = generateRequestId();

  const locForQueue = credentials?.locationId ?? locationId;
  const token = credentials?.token ?? tokenOverride;
  // Pipelines work without Location-Id; opportunities/search may require it. Send for opportunities path only when we have locationId.
  const isOpportunitiesSearch = Boolean(path?.startsWith('/opportunities/search'));
  const sendLocationIdHeader = Boolean(
    locationId && (!credentials?.token || isOpportunitiesSearch)
  );

  if (!token || typeof token !== 'string') {
    return {
      ok: false,
      error: fromError(new Error('GHL API token not configured'), requestId),
    };
  }

  ensureCacheTTL();

  const queryString = params
    ? new URLSearchParams(params).toString()
    : '';
  const pathWithQuery = queryString ? `${path}${path.includes('?') ? '&' : '?'}${queryString}` : path;
  const url = `${GHL_API_BASE}${pathWithQuery}`;

  const cacheKey =
    method === 'GET' && locForQueue && !skipCache
      ? buildCacheKey(locForQueue, method, path, params)
      : null;

  if (cacheKey) {
    const cached = getCached<T>(cacheKey);
    if (cached) {
      if (process.env.NODE_ENV !== 'test') {
        console.info('[GHL]', { requestId, cache: 'hit', path: path.slice(0, 60) });
      }
      return { ok: true, data: cached.data, requestId };
    }
  }

  if (isCircuitOpen(locForQueue)) {
    return {
      ok: false,
      error: {
        ...fromError(new Error('GHL circuit open; try again shortly'), requestId),
        type: 'server',
        retryable: true,
      },
    };
  }

  await acquireSlot(locForQueue);
  const start = Date.now();

  try {
    if (process.env.NODE_ENV !== 'test') {
      console.info('[GHL]', {
        requestId,
        locationId: maskLocationId(locForQueue),
        method,
        path: path.slice(0, 80),
        timestamp: new Date().toISOString(),
      });
    }

    let lastError: GHLClientError | null = null;
    let lastStatus: number | undefined;
    let lastBody: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Version: '2021-07-28',
      };
      if (sendLocationIdHeader && locationId) {
        headers['Location-Id'] = locationId;
      }

      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };
      if (body && (method === 'POST' || method === 'PUT')) {
        init.body = JSON.stringify(body);
      }

      try {
        const response = await fetch(url, init);
        clearTimeout(timeoutId);
        const responseText = await response.text();
        const latencyMs = Date.now() - start;

        if (process.env.NODE_ENV !== 'test') {
          console.info('[GHL]', {
            requestId,
            status: response.status,
            latencyMs,
            retryCount: attempt,
          });
        }

        if (response.ok) {
          recordSuccess(locForQueue);
          let data: T;
          if (!responseText?.trim()) {
            data = undefined as T;
          } else {
            try {
              data = JSON.parse(responseText) as T;
            } catch {
              return {
                ok: false,
                error: fromError(new Error('Invalid JSON response'), requestId),
              };
            }
          }
          if (cacheKey && response.status >= 200 && response.status < 300) {
            setCached(cacheKey, data, response.status);
          }
          return { ok: true, data, requestId };
        }

        let parsedBody: unknown = null;
        if (responseText?.trim()) {
          try {
            parsedBody = JSON.parse(responseText);
          } catch {
            parsedBody = responseText;
          }
        }

        lastStatus = response.status;
        lastBody = parsedBody;
        lastError = fromResponse(response.status, parsedBody, requestId);

        if (path?.includes('opportunities/search') && process.env.NODE_ENV !== 'test') {
          console.warn('[GHL] opportunities/search non-ok', { status: response.status, body: parsedBody });
        }
        if (debugHeaders()) {
          const h: Record<string, string> = {};
          response.headers.forEach((val, key) => {
            h[key] = val;
          });
          console.warn('[GHL] response headers', requestId, h);
        }

        if (!lastError.retryable || attempt >= MAX_RETRIES) {
          recordFailure(locForQueue);
          return { ok: false, error: lastError };
        }

        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 15000)
          : RETRY_DELAYS_MS[attempt] ?? 4000;

        if (process.env.NODE_ENV !== 'test') {
          console.warn('[GHL] retry', { requestId, status: response.status, waitMs, attempt: attempt + 1 });
        }
        await new Promise((r) => setTimeout(r, waitMs));
      } catch (err) {
        clearTimeout(timeoutId);
        const ghlErr = fromError(err, requestId);
        if (!ghlErr.retryable || attempt >= MAX_RETRIES) {
          recordFailure(locForQueue);
          return { ok: false, error: ghlErr };
        }
        lastError = ghlErr;
        const waitMs = RETRY_DELAYS_MS[attempt] ?? 4000;
        if (process.env.NODE_ENV !== 'test') {
          console.warn('[GHL] retry after error', { requestId, message: ghlErr.message, waitMs, attempt: attempt + 1 });
        }
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    recordFailure(locForQueue);
    return {
      ok: false,
      error: lastError ?? fromResponse(lastStatus ?? 0, lastBody, requestId),
    };
  } finally {
    releaseSlot(locForQueue);
  }
}
