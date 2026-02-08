# GHL Iframe App Auth Process (Reference)

This document defines the **exact** auth flow for the CleanQuote marketplace app so it matches the official GHL pattern and works identically in the iframe. The UI (dashboard, setup, oauth-success pages) is ours; the **auth process** below is the single source of truth.

## Reference: GoHighLevel template + marketplace OAuth

- [GHL Marketplace App Template](https://github.com/GoHighLevel/ghl-marketplace-app-template): `/authorize-handler` receives `code`, exchanges for tokens, stores by `locationId` or `companyId`, redirects.
- [GHL OAuth 2.0](https://marketplace.gohighlevel.com/docs/Authorization/OAuth2.0): Authorization code flow; token endpoint requires `client_id`, `client_secret`, `grant_type`, `code`, `redirect_uri`.
- Our iframe flow adds: **chooselocation** (so user picks location), **state** (carries `locationId` + `redirect`), persistent storage (KV), and session cookie so the app works inside the GHL iframe.

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

## 4. Callback (`GET /api/auth/oauth/callback`)

- Query params from GHL: `code`, `state`; optional `error`, `locationId`.
- If `error` → redirect to `/oauth-success?error=...&error_description=...`.
- If no `code` → redirect to `/oauth-success?error=no_code`.
- **Token exchange** (same as GHL template + OAuth spec):
  - `POST https://services.leadconnectorhq.com/oauth/token`
  - Body (form): `grant_type=authorization_code`, `client_id`, `client_secret`, `code`, **`redirect_uri`** (must match authorize).
  - Parse JSON: `access_token`, `refresh_token`, `expires_in`, `locationId`/`location_id`, `companyId`/`company_id`, `userId`/`user_id`.
- **Location ID** (same as GHL template: prefer token response; then state/query for iframe; then API):
  1. From **token response** → `locationId` / `location_id` / `location.id`.
  2. From **state** (decoded JSON) → `locationId` / `location_id`.
  3. From **query** → `locationId`.
  4. If still missing → GET `https://services.leadconnectorhq.com/locations/` with Bearer token, take first location id.
- **Store installation** by **locationId** (template stores by locationId or companyId; we key by locationId for iframe):
  - Persist in KV: `ghl:install:{locationId}` with access_token, refresh_token, expires_at, companyId, userId, locationId. This is the source of truth for future lookup: session verification, `getTokenForLocation`, and token refresh all read from KV.
  - On failure → redirect to `/oauth-success?error=storage_failed&error_description=...` (no cookie, no success).
  - Callback verifies read-back from KV after write and logs `[CQ Callback] STEP 7a — KV verify OK` when tokens are readable.
- **Session cookie**:
  - Create JWT with `locationId`, `companyId`, `userId`.
  - Set cookie: `ghl_session`, httpOnly, secure, sameSite=none, path=/, domain=app host (for production).
- **Redirect** from **state**:
  - Parse state → `redirect` (default **`/dashboard`** so user lands in the app in same tab, same as working GHL marketplace apps).
  - Redirect to `APP_BASE + redirect` with `locationId` in query if needed; on success add `success=oauth_installed` when redirect is `/oauth-success`. If redirect is `/dashboard`, user goes straight into the app (no redirect loop).

No UI in callback; redirect only.

## 5. Iframe context (client)

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
- **UI**: Our dashboard, setup, oauth-success, open-from-ghl; auth process above is shared and must not diverge without updating this doc.
