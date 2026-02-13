/**
 * Public GHL client for dashboard: getContacts, getOpportunities, getQuoteRecords, getPipelines.
 * All calls go through the centralized request layer (timeout, retries, queue, cache).
 */

import type { GHLCredentials } from '@/lib/ghl/credentials';
import { request, invalidateCacheForLocation } from './request-client';
import type { GHLClientError } from './errors';

export type { GHLClientError };
export { request, invalidateCacheForLocation } from './request-client';
export { isRetryable } from './errors';

export interface GetContactsParams {
  limit?: number;
  search?: string;
}

export interface GetContactsResult {
  ok: true;
  data: { contacts: any[]; total: number };
}
export interface GetContactsError {
  ok: false;
  error: GHLClientError;
}

export async function getContacts(
  locationId: string,
  credentials: GHLCredentials | null,
  params?: GetContactsParams
): Promise<GetContactsResult | GetContactsError> {
  if (!credentials?.token || !credentials?.locationId) {
    return {
      ok: false,
      error: {
        ok: false,
        type: 'auth',
        message: 'GHL credentials required',
        retryable: false,
      },
    };
  }

  // GHL contacts API rejects limit > 100 (e.g. "limit must not be greater than 100")
  const limit = Math.min(100, Math.max(1, params?.limit ?? 100));
  const searchParams: Record<string, string> = {
    locationId,
    limit: String(limit),
  };
  if (params?.search?.trim()) {
    searchParams.query = params.search.trim();
  }

  const result = await request<{ contacts?: any[]; total?: number }>({
    method: 'GET',
    path: '/contacts',
    params: searchParams,
    locationId: credentials.locationId,
    credentials,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const contacts = Array.isArray(result.data?.contacts) ? result.data.contacts : [];
  const total = result.data?.total ?? contacts.length;
  return {
    ok: true,
    data: { contacts, total },
  };
}

/** Tag names that identify "active" customers for the service area map. */
export const ACTIVE_CUSTOMER_TAG_NAMES = ['active', 'active client'] as const;

/**
 * Fetch contacts and filter by tags (client-side). Used for active-customer-addresses.
 * GET /contacts does not support tag filter; returns up to limit contacts, then we filter.
 */
export async function getContactsWithTagFilter(
  locationId: string,
  credentials: GHLCredentials | null,
  tagNames: readonly string[],
  params?: { limit?: number }
): Promise<GetContactsResult | GetContactsError> {
  const result = await getContacts(locationId, credentials, {
    limit: Math.min(100, Math.max(1, params?.limit ?? 100)),
  });
  if (!result.ok) return result;
  const normalizedTags = tagNames.map((t) => t.trim().toLowerCase()).filter(Boolean);
  const filtered = result.data.contacts.filter((c: any) => {
    const tags = Array.isArray(c.tags) ? c.tags : [];
    const hasTag = tags.some(
      (t: string) => normalizedTags.includes(String(t).trim().toLowerCase())
    );
    return hasTag;
  });
  return {
    ok: true,
    data: { contacts: filtered, total: filtered.length },
  };
}

export interface GetOpportunitiesParams {
  pipelineId?: string;
  limit?: number;
  status?: string;
}

export interface GetOpportunitiesResult {
  ok: true;
  data: { opportunities: any[]; total: number };
}
export interface GetOpportunitiesError {
  ok: false;
  error: GHLClientError;
}

const OPPORTUNITIES_PAGE_SIZE = 100;
const OPPORTUNITIES_MAX_TOTAL = 5000;

export async function getOpportunities(
  locationId: string,
  credentials: GHLCredentials | null,
  params: GetOpportunitiesParams = {}
): Promise<GetOpportunitiesResult | GetOpportunitiesError> {
  if (!credentials?.token || !credentials?.locationId) {
    return {
      ok: false,
      error: {
        ok: false,
        type: 'auth',
        message: 'GHL credentials required',
        retryable: false,
      },
    };
  }

  const perPage = Math.min(OPPORTUNITIES_PAGE_SIZE, Math.max(1, params.limit ?? 100));
  const all: any[] = [];
  const seenIds = new Set<string>();
  let skip = 0;
  let metaTotal: number | undefined;

  while (all.length < OPPORTUNITIES_MAX_TOTAL) {
    const searchParams: Record<string, string> = {
      location_id: locationId,
      limit: String(perPage),
      skip: String(skip),
    };
    if (params.pipelineId) searchParams.pipeline_id = params.pipelineId;
    if (params.status) searchParams.status = params.status;

    const result = await request<{
      opportunities?: any[];
      data?: any[];
      meta?: { total?: number };
    }>({
      method: 'GET',
      path: '/opportunities/search',
      params: searchParams,
      locationId: credentials.locationId,
      credentials,
    });

    if (!result.ok) {
      if (skip > 0) break;
      return { ok: false, error: result.error };
    }

    const res = result.data;
    if (res?.meta?.total != null) metaTotal = res.meta.total;
    const opportunities = res?.opportunities ?? res?.data ?? (Array.isArray(res) ? res : []);
    const list = Array.isArray(opportunities) ? opportunities : [];
    let newCount = 0;
    for (const o of list) {
      const id = o?.id;
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        all.push(o);
        newCount++;
      }
    }
    if (list.length < perPage || newCount === 0) break;
    skip += list.length;
  }

  return {
    ok: true,
    data: {
      opportunities: all.slice(0, OPPORTUNITIES_MAX_TOTAL),
      total: metaTotal ?? all.length,
    },
  };
}

export interface GetQuoteRecordsParams {
  limit?: number;
}

export interface GetQuoteRecordsResult {
  ok: true;
  data: any[];
}
export interface GetQuoteRecordsError {
  ok: false;
  error: GHLClientError;
}

function parseQuoteRecords(res: any): any[] {
  if (Array.isArray(res)) return res;
  if (res?.records && Array.isArray(res.records)) return res.records;
  if (res?.data && Array.isArray(res.data)) return res.data;
  if (res?.customObjects && Array.isArray(res.customObjects)) return res.customObjects;
  if (typeof res === 'object') {
    for (const key of Object.keys(res)) {
      if (Array.isArray(res[key])) return res[key];
    }
  }
  return [];
}

export async function getQuoteRecords(
  locationId: string,
  credentials: GHLCredentials | null,
  params?: GetQuoteRecordsParams
): Promise<GetQuoteRecordsResult | GetQuoteRecordsError> {
  if (!credentials?.token || !credentials?.locationId) {
    return {
      ok: false,
      error: {
        ok: false,
        type: 'auth',
        message: 'GHL credentials required',
        retryable: false,
      },
    };
  }

  const pageLimit = Math.min(500, Math.max(1, params?.limit ?? 200));
  const schemaKeysToTry = ['custom_objects.quotes', 'Quote', 'quotes'];
  const bodyVariants = [
    { location_id: locationId, page: 1, pageLimit },
    { locationId, page: 1, pageLimit },
  ];

  for (const schemaKey of schemaKeysToTry) {
    for (const body of bodyVariants) {
      const first = await request<{ records?: any[]; data?: any[] }>({
        method: 'POST',
        path: `/objects/${schemaKey}/records/search`,
        body: body as Record<string, unknown>,
        locationId: credentials.locationId,
        credentials,
      });

      if (!first.ok) continue;

      const firstPage = parseQuoteRecords(first.data);
      if (!Array.isArray(firstPage)) continue;

      const all: any[] = [...firstPage];
      if (firstPage.length < pageLimit) {
        return { ok: true, data: all };
      }

      const maxPages = 100;
      for (let page = 2; page <= maxPages; page++) {
        const nextBody =
          'location_id' in body
            ? { location_id: locationId, page, pageLimit }
            : { locationId, page, pageLimit };
        const next = await request<{ records?: any[]; data?: any[] }>({
          method: 'POST',
          path: `/objects/${schemaKey}/records/search`,
          body: nextBody as Record<string, unknown>,
          locationId: credentials.locationId,
          credentials,
        });
        if (!next.ok) break;
        const nextRecords = parseQuoteRecords(next.data);
        const nextList = Array.isArray(nextRecords) ? nextRecords : [];
        all.push(...nextList);
        if (nextList.length < pageLimit) {
          return { ok: true, data: all };
        }
      }
      return { ok: true, data: all };
    }
  }

  return {
    ok: false,
    error: {
      ok: false,
      type: 'server',
      message: 'Failed to load quote records from GHL',
      retryable: true,
    },
  };
}

export interface GetPipelinesResult {
  ok: true;
  data: any[];
}
export interface GetPipelinesError {
  ok: false;
  error: GHLClientError;
}

export async function getPipelines(
  locationId: string,
  credentials: GHLCredentials | null
): Promise<GetPipelinesResult | GetPipelinesError> {
  if (!credentials?.token || !credentials?.locationId) {
    return {
      ok: false,
      error: {
        ok: false,
        type: 'auth',
        message: 'GHL credentials required',
        retryable: false,
      },
    };
  }

  const result = await request<{ pipelines?: any[]; data?: any[] }>({
    method: 'GET',
    path: '/opportunities/pipelines',
    params: { locationId },
    locationId: credentials.locationId,
    credentials,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const pipelines = result.data?.pipelines ?? result.data?.data ?? [];
  const list = Array.isArray(pipelines) ? pipelines : [];
  return { ok: true, data: list };
}
