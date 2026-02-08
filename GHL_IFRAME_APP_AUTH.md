# GHL Iframe App Auth Process (Reference)

This document defines the **exact** auth flow for the CleanQuote marketplace app so it matches the official GHL pattern and works identically in the iframe. The UI (dashboard, setup, oauth-success pages) is ours; the **auth process** below is the single source of truth.

## Reference: GoHighLevel template + marketplace OAuth

- **[GHL Marketplace App Template](https://github.com/GoHighLevel/ghl-marketplace-app-template)** (Express + Vue): `/authorize-handler` receives `code`, exchanges for tokens, stores by `locationId` or `companyId`, redirects; `/decrypt-sso` decrypts SSO payload from parent using `GHL_APP_SSO_KEY`; Vue app in iframe requests user data via postMessage. We follow the same token exchange and SSO decrypt pattern; our callback is `/api/auth/connect/callback` and we use chooselocation + KV + session cookie.
- [GHL OAuth 2.0](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0): Authorization code flow; token endpoint requires `client_id`, `client_secret`, `grant_type`, `code`, `redirect_uri`.
- Our iframe flow adds: **chooselocation** (so user picks location), **state** (carries `locationId` + `redirect`), persistent storage (KV), and session cookie so the app works inside the GHL iframe.

### LocationId: same as template / Maid Central

We do it **exactly like the [GHL template](https://github.com/GoHighLevel/ghl-marketplace-app-template)** and Maid Central:

- **Only one locationId** — the one for the app that was just installed. That comes from **GHL’s token response** when we exchange the authorization code.
- Callback uses **token response first**: `locationId` / `location_id` / `location.id` / `resource_id` from the token JSON. If missing, we fall back to `GET /locations/` with the Bearer token (same as template pattern).
- We **do not** use state or cookie for locationId. State is only used for `redirect` and `orgId`. There is no “iframe location” override — the location where the app was installed is the one GHL returns in the token.

---

## 1. Entry points (who starts the flow)

| Entry | URL | When |
|-------|-----|------|
| App Launch (GHL) | `/app` or GHL “Live URL” | User opens app from GHL sidebar/menu. |
| Setup (iframe) | `/dashboard/setup` | User in iframe needs to install OAuth for current location. |
| Direct dashboard | `/dashboard` | User/bookmark; middleware may redirect to authorize or open-from-ghl. |

## 2. App Launch (`GET /app`)

- If **session cookie** valid → redirect to `?redirect` or `/dashboard`.
- Else if **locationId** in query or referrer and we have a **token** for that location → redirect to dashboard (no OAuth).
- Else → redirect to **`/api/auth/oauth/authorize`** with `locationId` and `redirect` in query (so state can carry them).

No UI here; redirect only. Same idea as template “after install redirect” but to our app.

## 3. Authorize (`GET /api/auth/oauth/authorize`)

- Reads: `locationId`, `redirect` from query (optional).
- Builds GHL URL: **`https://marketplace.gohighlevel.com/oauth/chooselocation`** with:
  - `response_type=code`
  - `client_id`, `redirect_uri`, `version_id` (from client_id), `prompt=consent`
  - `scope` = required scopes (e.g. locations, contacts, calendars, opportunities), `+` separated.
  - **`state`** = base64(JSON) with at least:
    - `locationId` (if from iframe/setup)
    - `redirect` (e.g. `/dashboard`; default in callback is `/dashboard`) so callback knows where to send user.
- Responds with **302** to that GHL URL. No UI; redirect only.

## 4. Callback (`GET /api/auth/connect/callback` — canonical; `/api/auth/oauth/callback` also supported)

- Query params from GHL: `code`, `state`; optional `error`, `locationId`.
- If `error` → redirect to `/oauth-success?error=...&error_description=...`.
- If no `code` → redirect to `/oauth-success?error=no_code`.
- **Token exchange** (same as GHL template + OAuth spec):
  - `POST https://services.leadconnectorhq.com/oauth/token`
  - Body (form): `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, **`redirect_uri`** (must match authorize).
  - Parse JSON: `access_token`, `refresh_token`, `expires_in`, `locationId`/`location_id`, `companyId`/`company_id`, `userId`/`user_id`.
- **Location ID** (same as GHL template / Maid Central — only the app that was installed):
  1. From **token response** → `locationId` / `location_id` / `location.id` / `resource_id`. This is the single source of truth.
  2. If still missing → GET `https://services.leadconnectorhq.com/locations/` with Bearer token, take first location id.
  - State and query are **not** used for locationId (only for `redirect` and `orgId`).
- **Store installation** by **locationId** (template stores by locationId or companyId; we key by locationId for iframe):
  - Fetch location/company name from GHL (`GET /locations/:locationId`) for display in the UI.
  - Persist in KV: `ghl:install:{locationId}` with access_token, refresh_token, expires_at, companyId, userId, locationId, companyName. This is the source of truth for future lookup: **every time a user loads with a locationId**, the app uses this KV lookup to get the token (and optional companyName) for GHL API calls (contacts, stats, etc.). Session verification, `getTokenForLocation`, and token refresh all read from KV.
  - On failure → redirect to `/oauth-success?error=storage_failed&error_description=...` (no cookie, no success).
  - Callback verifies read-back from KV after write and logs `[CQ Callback] STEP 7a — KV verify OK` when tokens are readable.
- **Session cookie**:
  - Create JWT with `locationId`, `companyId`, `userId`.
  - Set cookie: `ghl_session`, httpOnly, secure, sameSite=none, path=/, domain=app host (for production).
- **Redirect** from **state**:
  - Parse state → `redirect` (default **`/dashboard`** so user lands in the app in same tab, same as working GHL marketplace apps).
  - Redirect to `APP_BASE + redirect` with `locationId` in query if needed; on success add `success=oauth_installed` when redirect is `/oauth-success`. If redirect is `/dashboard`, user goes straight into the app (no redirect loop).

No UI in callback; redirect only.

## 4b. Token flow (OAuth → installed locations → location token → Contacts)

This is the exact sequence we use so you can verify it against the [GHL OAuth docs](https://marketplace.gohighlevel.com/docs/ghl/oauth/get-access-token):

1. **OAuth Access Token**  
   - We get it at **OAuth success** (callback): exchange `code` for tokens via [Get Access Token](https://marketplace.gohighlevel.com/docs/ghl/oauth/get-access-token) (`POST /oauth/token`).  
   - We store it (per-location install in KV, and if Company user also as “agency” token for step 3).  
   - If we didn’t have it, we would get it via that same endpoint (authorize with all scopes you need, then exchange code → token). We do **not** use query param or cookie as the primary source for **locationId**; see step 2.

2. **Location where app is installed**  
   - Once we have the OAuth Access Token, we get **locationId** from [Get Location where app is installed](https://marketplace.gohighlevel.com/docs/ghl/oauth/get-installed-location) (`GET /oauth/installedLocations`) when the request doesn’t already provide locationId (e.g. no `x-ghl-location-id` header).  
   - Resolution order: **x-ghl-location-id** → **GET /oauth/installedLocations** → then query param and session (cookie) as last resort.

3. **Location Access Token**  
   - For each **locationId** we need a location-scoped token. We get it via [Get Location Access Token from Agency Token](https://marketplace.gohighlevel.com/docs/ghl/oauth/get-location-access-token) (`POST /oauth/locationToken`) using the OAuth Access Token (agency/install token).  
   - We **store that Location Access Token in KV** keyed by **locationId** so later requests don’t need to call POST /oauth/locationToken again.

4. **Contact (and other location) API calls**  
   - We use the **Location Access Token** (from step 3) and **locationId** for Contacts and other location-scoped APIs (e.g. `POST /contacts/search`).  
   - We do **not** use the raw OAuth Access Token for those calls; the OAuth Access Token is used only for `GET /oauth/installedLocations` and `POST /oauth/locationToken`.

## 5. Iframe context (client)

- **App host:** Our **pages run on www.cleanquote.io** (OAuth callback, dashboard, setup). The **GHL whitelabel app** (parent/entry in GHL) is **my.cleanquote.io**. After OAuth, users are redirected to www.cleanquote.io. PostMessage requests include `origin: window.location.origin`, so when the iframe loads from www we send `https://www.cleanquote.io`; GHL must reply to that origin.
- **GHLIframeProvider** (or equivalent) runs when app is loaded in iframe.
- **locationId** resolution order (per reference below):
  1. URL params/hash: `locationId`, `location_id`, etc.
  2. URL path: `/location/{id}` or `/(v1|v2)/location/{id}`.
  3. Referrer (GHL parent) path or query.
  4. `window.name` (JSON or plain id).
  5. Session cache (e.g. sessionStorage).
  6. **postMessage**: send `REQUEST_USER_DATA` to parent; on `REQUEST_USER_DATA_RESPONSE`, decrypt payload with **GHL_APP_SSO_KEY** (Shared Secret) and use `activeLocation` / `locationId` etc.
- Store resolved context (e.g. POST `/api/ghl/iframe-context`) and in sessionStorage so dashboard/setup use the same locationId.
- **App-wide user context**: The provider also fetches **GET /api/dashboard/session** when iframe has no locationId (e.g. same-tab after OAuth). It exposes **effectiveLocationId** (iframe or session) and **userContext: { locationId }** so the **entire app** uses one resolved location for all API calls. Use **useEffectiveLocationId()** or **useGHLUserContext()** in any dashboard page; never rely only on ghlData when making GHL-backed API requests.

## 5b. UI ↔ GHL data flow (locationId + token → fill UI)

Communication between the UI and the GHL location (id + token) works as follows so the UI can be filled with GHL data (contacts, stats, etc.):

1. **UI has locationId**: **effectiveLocationId** is set by the iframe context (postMessage decrypt, URL, referrer, or sessionStorage) or by the session (same-tab after OAuth). Use **useEffectiveLocationId()** or **useDashboardApi()** in dashboard pages.
2. **Every dashboard API request sends locationId**: Use **useDashboardApi()** from `@/lib/dashboard-api` so each request includes `?locationId=...` and the **x-ghl-location-id** header. This guarantees the backend can resolve the token for that location.
3. **Backend resolves token**: **resolveGHLContext(request)** (in `api-context.ts`) reads locationId from the query or **x-ghl-location-id** header, then calls **getOrFetchTokenForLocation(locationId)** to get the access token from KV (stored at install). If token exists → returns `{ locationId, token }`; if not → returns `{ needsConnect: true }`.
4. **Dashboard routes use context**: Routes such as **GET /api/dashboard/ghl/verify**, **GET /api/dashboard/crm/stats**, **GET /api/dashboard/crm/contacts** call **resolveGHLContext(request)** and then call the GHL API with the resolved token and locationId (e.g. **listGHLContacts(locationId, options, { token, locationId })**). The response fills the UI.

**Requirements for data to load**: (a) **effectiveLocationId** must be set (iframe got locationId or session has it). (b) That location must have completed OAuth once so KV has the token. If (a) is missing, user must open the app from a GHL sub-account/location or add locationId to the URL. If (b) is missing, user must go to Setup and complete “Install via OAuth” for that location.

## 6. Decrypt SSO / user context

- **POST /api/ghl/iframe-context/decrypt**: body `{ encryptedData }` or `{ key }`.
- Use **GHL_APP_SSO_KEY** to decrypt (algorithm per GHL docs / template).
- Return `{ success, locationId, userId, companyId, ... }` for iframe context.

## 7. Dashboard and middleware

- **Middleware** (dashboard routes):
  - Valid **ghl_session** → allow request.
  - **/dashboard/setup** → always allow (no session required) so iframe can load and show “Install via OAuth”.
  - No session + from GHL (referrer or `?ghl=1`) → redirect to **/api/auth/oauth/authorize** with current path as `redirect` and `locationId` when present (e.g. from referrer path or query).
  - No session + not from GHL → redirect to **/open-from-ghl**.
- **Dashboard UI** (our UI): show app content when session exists (in iframe or same tab — no redirect to open-from-ghl when session is valid; matches working GHL apps). Show “Connect location” or setup when no token for current location.

## 8. Setup page (iframe)

- Uses **GHLIframeProvider** and **useEffectiveLocationId()** so **effectiveLocationId** is set (from iframe or session).
- “Install via OAuth” → **same-window** navigate to `/api/auth/oauth/authorize?locationId={locationId}&redirect=/dashboard` so callback redirects into the app in same tab and cookie is sent (same as working GHL marketplace apps).
- After return, user is on `/dashboard`; session cookie is used.

## 9. Summary

- **Authorize**: only redirects to GHL chooselocation with state (locationId + redirect).
- **Callback**: exchange code → resolve locationId (state → query → token → API) → store by locationId in KV → set session cookie → redirect to state.redirect.
- **App launch**: session or token for location → dashboard; else → authorize with locationId/redirect.
- **Iframe**: resolve locationId (URL → referrer → postMessage/decrypt), then use for setup and API calls.
- **UI ↔ data**: Dashboard pages use **useDashboardApi()** or pass **effectiveLocationId** on every API call; backend uses **resolveGHLContext** → **getOrFetchTokenForLocation** → GHL API so the UI is filled with location data.
- **UI**: Our dashboard, setup, oauth-success, open-from-ghl; auth process above is shared and must not diverge without updating this doc.
