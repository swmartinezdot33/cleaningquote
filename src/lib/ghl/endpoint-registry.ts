/**
 * Registry of GHL location endpoints used for reliability testing and replication.
 * Keep in sync with the endpoint table in the plan (GHL location endpoints reference).
 */

export interface EndpointSpec {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  /** Query params for GET; path may already contain ? for compatibility. */
  paramsExample?: Record<string, string>;
  /** POST/PUT body (e.g. for search). Omit for GET. */
  bodyExample?: Record<string, unknown>;
  /** If true, test script must resolve pipelineId first (e.g. from getPipelines). */
  needsPipelineId?: boolean;
}

export const DASHBOARD_ENDPOINTS: EndpointSpec[] = [
  {
    id: 'contacts',
    method: 'GET',
    path: '/contacts',
    paramsExample: { locationId: '{{locationId}}', limit: '1' },
  },
  {
    id: 'opportunities',
    method: 'GET',
    path: '/opportunities/search',
    paramsExample: { location_id: '{{locationId}}', limit: '1', skip: '0' },
    needsPipelineId: true,
  },
  {
    id: 'pipelines',
    method: 'GET',
    path: '/opportunities/pipelines',
    paramsExample: { locationId: '{{locationId}}' },
  },
];

/** Quotes use POST search; schema key may vary. Handled by getQuoteRecords in ghl-client. */
export const QUOTES_SEARCH_ENDPOINT: EndpointSpec = {
  id: 'quotes-search',
  method: 'POST',
  path: '/objects/custom_objects.quotes/records/search',
  bodyExample: { locationId: '{{locationId}}', page: 1, pageLimit: 1 },
};

/**
 * Full list of endpoints to run in the reliability script.
 * Replace {{locationId}} and {{pipelineId}} with real values when invoking.
 */
export function getReliabilityEndpoints(): EndpointSpec[] {
  return [
    ...DASHBOARD_ENDPOINTS,
    QUOTES_SEARCH_ENDPOINT,
  ];
}
