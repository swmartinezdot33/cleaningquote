# GHL Iframe App Auth (Reference)

This document is the **source of truth** for the CleanQuote marketplace app auth flow. Storage is **KV only** (no Supabase for install sessions or location installations). The flow binds each OAuth completion to a **location** using state → KV and cookies.

## 1. Overview

- **Callback URL**: `https://www.cleanquote.io/api/auth/connect/callback` (or your app base + `/api/auth/connect/callback`).
- **Flow**: User starts connect from iframe/setup with `locationId` (and optional `companyId`) → we store an install session in KV keyed by a **state UUID** and set pending cookies → redirect to GHL chooselocation → user authorizes → GHL redirects to callback with `code` and `state` → we resolve **locationId** from state→KV first, then cookies → exchange code for tokens → POST `/oauth/locationToken` to get Location Access Token → store in KV with `oauth_connected: true` → clear pending cookies, set session cookie, return success HTML.
- **Location binding**: We **never** use the token response as the primary source for which location this install is for. The location is determined **before** exchanging the code (state→KV or cookies). If we cannot resolve a locationId, we **abort** and do not store any tokens.

## 2. KV keys and cookies

### KV keys

| Key | Value | TTL | Purpose |
|-----|--------|-----|---------|
| `ghl:install_session:{state}` | `{ location_id, company_id }` | 600s | One-time install session. Written by authorize/install; read and **deleted** by callback via `getAndConsumeInstallSession(state)`. |
| `ghl:install:{locationId}` | Full install payload (see below) | 1 year | Per-location installation. `getInstallation(locationId)` enforces that the stored `locationId` matches the requested one (normalized); on mismatch returns `null` (no cross-location use). |

**Install payload** (at `ghl:install:{locationId}`): `locationId`, `accessToken`, `refreshToken`, `expiresAt`, `userType`, `oauth_connected`, `oauth_response`, `oauth_expires_at`, `location_token_response`.

### Cookies

| Cookie | Set by | Cleared by | Purpose |
|--------|--------|------------|---------|
| `ghl_pending_location_id` | Authorize (when `locationId` in query) | Callback (on success) | Fallback for resolving location when KV session is missing/expired. |
| `ghl_pending_company_id` | Authorize (when `companyId` in query) | Callback (on success) | Company id for POST `/oauth/locationToken`. |
| `ghl_pending_oauth_state` | Authorize (when `locationId` in query) | Callback (on success) | Value = state UUID (for reference; resolution uses KV lookup by state). |
| `ghl_session` | Callback (on success) | — | JWT with `locationId`, `companyId`, `userId`. httpOnly, secure, sameSite=none, path=/, optional domain. |

Cookie options for pending cookies: `httpOnly: true`, `secure: true`, `sameSite: 'lax'`, `maxAge: 600`, `path: '/'`.

## 3. Entry points

| Entry | URL | When |
|-------|-----|------|
| Install (GHL / setup) | `GET /install?locationId=xxx&companyId=yyy` | User clicks “Connect” from iframe/setup. Redirects to authorize with same params. Open in same tab or new tab so callback receives cookies. |
| Authorize | `GET /api/auth/oauth/authorize?locationId=xxx&companyId=yyy&redirect=...` | Called by `/install` or directly (e.g. dashboard/setup link). Starts OAuth and binds to location. |
| Callback | `GET /api/auth/connect/callback?code=...&state=...` | GHL redirects here after user authorizes. |
| OAuth status | `GET /api/auth/oauth/status?locationId=xxx` (or `x-ghl-location-id` header) | Returns `installed`, `oauth_connected`, `hasToken`, `canRefresh` from KV. |

## 4. Install → Authorize

**`GET /install`**

- Query: `locationId`, `location_id`, `companyId`, `company_id` (all optional).
- Redirects to `{APP_BASE}/api/auth/oauth/authorize` with the same query params.
- No KV or cookies set here; authorize does that.

## 5. Authorize

**`GET /api/auth/oauth/authorize`**

- Query: `locationId` (or `location_id`), `companyId` (or `company_id`), `redirect` (optional).
- Generates **state** = `randomUUID()`.
- If **locationId** is present:
  - Calls **setInstallSession(state, locationId, companyId)** → writes `ghl:install_session:{state}` in KV (TTL 600s).
  - Sets cookies: `ghl_pending_location_id`, `ghl_pending_company_id`, `ghl_pending_oauth_state` (value = state).
- Builds GHL URL: `https://marketplace.leadconnectorhq.com/oauth/chooselocation` with `response_type=code`, `client_id`, `redirect_uri`, `version_id`, `prompt=consent`, `state`, `scope`.
- Responds with **302** to that URL. No UI.

## 6. Callback

**`GET /api/auth/connect/callback`**

- Query from GHL: `code`, `state`; optional `error`, `error_description`.

**6.1 Errors**

- If `error` → return HTML error page (OAuth error from GHL).
- If no `code` → return HTML error (missing code).
- If missing `GHL_CLIENT_ID` / `GHL_CLIENT_SECRET` / valid `GHL_REDIRECT_URI` → return HTML error (server config).

**6.2 Resolve locationId (before exchanging code)**

- **State → KV first**: If `state` is present, call **getAndConsumeInstallSession(state)**. If result has `location_id`, use it as **resolvedLocationId** and result’s `company_id` as **resolvedCompanyId**; source = `kv_session`.
- **Cookie fallback**: If still no resolvedLocationId, use cookie `ghl_pending_location_id` as **resolvedLocationId** and `ghl_pending_company_id` as **resolvedCompanyId**; source = `cookie`.
- **Abort if unresolved**: If **resolvedLocationId** is still null, **do not** exchange the code or store any tokens. Return HTML error asking the user to open the app from the location in GHL and click Connect again (e.g. state session expired).

**6.3 Token exchange and storage**

- POST `https://services.leadconnectorhq.com/oauth/token` with `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, `redirect_uri`.
- Parse OAuth response (e.g. `access_token`, `refresh_token`, `expires_in`).
- Call **fetchLocationTokenFromOAuth(locationId, companyId, oauthAccessToken)** → POST `/oauth/locationToken` with Bearer = OAuth access token, body `companyId`, `locationId`. Obtain Location Access Token.
- Call **storeLocationOAuthAndToken(locationId, oauthResponse, locationTokenResponse)** → writes to `ghl:install:{locationId}` with **oauth_connected: true**, OAuth response, and location token response.
- Verify read-back from KV; on failure return HTML error (storage failed).

**6.4 Response**

- Create session JWT with `locationId`, `companyId`, `userId`; set cookie **ghl_session**.
- Clear pending cookies: `ghl_pending_location_id`, `ghl_pending_company_id`, `ghl_pending_oauth_state` (maxAge 0).
- Return **200** with HTML success page (no redirect). User can click “Continue to Dashboard”.

## 7. Token flow (after install)

- **Location Access Token** is stored at `ghl:install:{locationId}` (from callback). It is used for all location-scoped GHL API calls (contacts, calendars, opportunities, etc.).
- **getInstallation(locationId)** returns the install only if the stored `locationId` (normalized) matches the requested one; otherwise returns `null`.
- **getTokenForLocation(locationId)** returns a valid Location Access Token: if the stored token is expired (or within refresh buffer), it runs **refreshAccessToken**:
  - If the install has **oauth_response** (OAuth-connected):
    - **Step 1**: If the Location OAuth token is expired, refresh it via POST `/oauth/token` (refresh_token, client_id, client_secret, redirect_uri, user_type=Location). Update KV with new `oauth_response` and `oauth_expires_at`.
    - **Step 2**: Re-exchange via **fetchLocationTokenFromOAuth** (POST `/oauth/locationToken`) and update KV with new Location Access Token and expiry.
  - If the install has no **oauth_response** (legacy), refresh using the stored Location refresh token directly (single-step legacy refresh).
- All reads/writes stay in KV; no DB tables for this flow.

## 8. OAuth status and API context

- **GET /api/auth/oauth/status**: Requires `locationId` (query or `x-ghl-location-id` header). Reads **getInstallation(locationId)** from KV. Returns `installed`, `hasToken`, **oauth_connected** (`install?.oauth_connected === true || hasToken`), `canRefresh`.
- **resolveGHLContext(request)** (e.g. for dashboard API): Resolves `locationId` from header, then locations search / installed locations, then query/session. Then calls **getOrFetchTokenForLocation(locationId)**. Strict locationId check is already enforced inside **getInstallation**; no cross-location use.

## 9. Iframe and setup

- **Setup page**: Uses iframe context (e.g. postMessage, URL, session) to get **effectiveLocationId**. “Install via OAuth” links to `/install?locationId={effectiveLocationId}&companyId=...` or directly to `/api/auth/oauth/authorize?locationId=...&redirect=/dashboard`. Same-tab or new-tab so callback receives cookies.
- **Dashboard**: Uses **effectiveLocationId** and sends it on every API request (e.g. `?locationId=...` and `x-ghl-location-id`). Backend uses **resolveGHLContext** → **getOrFetchTokenForLocation** → GHL API. If no token for that location, returns `needsConnect: true`; user must complete Connect from that location.

## 10. Summary

- **KV only**: Install sessions at `ghl:install_session:{state}` (TTL 600s); installations at `ghl:install:{locationId}`. No Supabase for this flow.
- **Authorize**: State UUID + setInstallSession + three pending cookies when locationId provided → redirect to GHL chooselocation.
- **Callback**: Resolve locationId by **state→KV first**, then cookies; **abort** if unresolved; exchange code → POST `/oauth/locationToken` → store with **oauth_connected: true**; clear pending cookies; set ghl_session.
- **Token refresh**: Two-step when oauth_connected (refresh OAuth token, then re-exchange for Location Access Token); legacy single-step otherwise. Strict locationId match on getInstallation.
- **Status**: GET `/api/auth/oauth/status` returns `oauth_connected` from KV for the given locationId.
