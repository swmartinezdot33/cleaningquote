'use client';

/**
 * Dashboard API helpers — user-context rule:
 *
 * 1. Every dashboard page must rely on user context: effectiveLocationId from
 *    postMessage (iframe) or URL/session. Use useEffectiveLocationId() or useDashboardApi().
 * 2. Every call to /api/dashboard/* must send that locationId (header + query) via
 *    dashboardApiFetch / useDashboardApi() so the backend uses the same context and
 *    can look up auth in KV for that location when needed.
 * 3. Do not use raw fetch() for dashboard API routes — use api() from useDashboardApi()
 *    so locationId and credentials are always attached.
 *
 * See GHL_IFRAME_APP_AUTH.md (UI ↔ GHL id + token flow).
 */

import { useCallback } from 'react';
import { useEffectiveLocationId } from '@/lib/ghl-iframe-context';

/**
 * Build URL with locationId (query param) and return fetch options with x-ghl-location-id header.
 * Use for server or when you already have locationId.
 */
export function dashboardApiOptions(
  path: string,
  locationId: string | null,
  init?: RequestInit
): { url: string; init: RequestInit } {
  const separator = path.includes('?') ? '&' : '?';
  const url = locationId ? `${path}${separator}locationId=${encodeURIComponent(locationId)}` : path;
  const headers = new Headers(init?.headers);
  if (locationId) headers.set('x-ghl-location-id', locationId);
  return {
    url,
    init: {
      ...init,
      headers,
      credentials: init?.credentials ?? 'include',
    },
  };
}

/**
 * Fetch a dashboard API route with locationId attached (query + header).
 * Backend uses resolveGHLContext(request) → KV (install token) or Agency → GHL API. User context supplies locationId.
 */
export function dashboardApiFetch(
  path: string,
  locationId: string | null,
  init?: RequestInit
): Promise<Response> {
  const { url, init: mergedInit } = dashboardApiOptions(path, locationId, init);
  return fetch(url, mergedInit);
}

/**
 * Hook: get a fetch function that always includes effectiveLocationId.
 * Use for all dashboard data calls so UI ↔ GHL (id + token) communication works.
 */
export function useDashboardApi() {
  const locationId = useEffectiveLocationId();
  const api = useCallback(
    (path: string, init?: RequestInit) => dashboardApiFetch(path, locationId, init),
    [locationId]
  );
  return { api, locationId };
}
