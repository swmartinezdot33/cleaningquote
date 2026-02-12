# GHL (LeadConnector) central client

All dashboard and server-side GHL API calls go through a single client so behavior is consistent and reliable.

## Token storage and selection

- **Storage:** Per-location tokens are stored in KV under `ghl:install:{locationId}`, set when a user completes OAuth (Connect) or the OAuth callback.
- **Dashboard:** `resolveGHLContext(request)` reads `locationId` from header → query → session, then gets a token via `getOrFetchTokenForLocation(locationId)` from the token store. No Company token is used in the dashboard flow.
- **Other flows (quote submit, appointments, admin):** Use `getGHLToken(toolId)` which resolves org → `ghl_location_id` → `getOrFetchTokenForLocation`, or an org-level token.

## Token refresh

The token store checks `expiresAt`; if the token is within 5 minutes of expiry it calls `refreshAccessToken` (OAuth refresh or two-step location token exchange) and writes the new token back to KV.

## Central client behavior

- **Request layer** (`src/lib/ghl/request-client.ts`): Single HTTP layer with configurable timeout (default 25s), retries for 408, 429, 5xx, 502/503/504 and network/timeout errors, exponential backoff (and `Retry-After` when present), per-location concurrency limit (4 in-flight), and optional circuit breaker.
- **Cache:** In-memory GET cache per locationId + path + params; TTL configurable via `GHL_CACHE_TTL_SEC` (default 60s). Cleared for a location on 401/403 so the next request can use a refreshed token.
- **Errors:** Normalized as `GHLClientError` with `type` (auth, rate_limit, server, network, timeout, client, unknown) and `retryable`. API routes map these to 401 (auth) or 502 (server/rate limit) as appropriate.
- **Dashboard usage:** Quotes, Contacts, Stats, Pipelines, and Opportunities API routes use `ghl-client` helpers (`getQuoteRecords`, `getContacts`, `getOpportunities`, `getPipelines`) so all traffic shares the same timeout, retries, queue, and cache.

## Optional environment variables

| Variable | Default | Description |
|--------|--------|-------------|
| `GHL_REQUEST_TIMEOUT_MS` | 25000 | Request timeout in milliseconds. |
| `GHL_CACHE_TTL_SEC` | 60 | In-memory cache TTL for GET responses (seconds). |
| `DEBUG_GHL_HEADERS` | (unset) | Set to `1` or `true` to log response headers on error (e.g. rate-limit headers). |

See `.env.example` for the full list of GHL-related variables.

## Optional: Agency token for create-location flow

If you use the API to create sub-accounts (e.g. from a Stripe webhook), you can set `GHL_AGENCY_ACCESS_TOKEN` and `GHL_COMPANY_ID`. You do **not** need these for normal Connect or location API calls.

**Shortcut when an Agency has already completed Connect:** the app stores their token in KV at `ghl:agency:token`. To copy that token and company ID into your env (for local use only; do not commit):

```bash
node scripts/print-agency-token-for-env.mjs
```

Then paste the printed lines into `.env.local`. Requires KV to be configured (e.g. `KV_REST_API_URL`, `KV_REST_API_TOKEN` in `.env.local`).
