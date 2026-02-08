# OAuth flow debugging

## 1. Check config and session from the browser

Open (same origin as your app, so the cookie is sent if present):

- **Production:** `https://cleanquote.io/api/debug/oauth`
- **Local:** `http://localhost:3000/api/debug/oauth`

You’ll get JSON with:

- `request.hasGhlSessionCookie` — whether the `ghl_session` cookie was sent
- `request.sessionValid` — whether that cookie is valid
- `config` — env vars and computed redirect URI (no secrets)

If you **just finished OAuth** and open this URL in the **same tab** that went through the callback, you should see `sessionValid: true`. If you open it in another tab or in an iframe, you may see `false` (cookie not sent in that context).

## 2. Check Vercel server logs and browser console

**Single search for entire process:** In **Vercel Logs** or **browser Console**, search for **`[CQ`** to see the whole flow in order.

### Server (Vercel Logs) — search `[CQ`

| Log prefix | When it runs |
|------------|----------------|
| `[CQ App]` | `/app` launch: redirectTo; then → redirect dashboard (session/token) or → redirect to authorize |
| `[CQ Authorize]` | Redirect to GHL chooselocation (host, hasLocationId, hasRedirect); then redirect URL built (stateKeys) |
| `[CQ Callback] STEP 1` | Callback hit (hasCode, hasState, hasError, paramKeys) |
| `[CQ Callback] STEP 2` | GHL error or no code |
| `[CQ Callback] STEP 3` | Exchanging code for token |
| `[CQ Callback] STEP 4` | Token response (status, ok) |
| `[CQ Callback] STEP 5` | Token received (hasAccessToken, hasLocationId, keys) |
| `[CQ Callback] STEP 5b/5c` | Invalid JWT or no access_token |
| `[CQ Callback] STEP 6` | locationId resolved or no locationId |
| `[CQ Callback] STEP 7` | Storing to KV |
| `[CQ token-store]` | storing (key, hasAccessToken, hasRefreshToken); stored OK (locationId) |
| `[CQ Callback] STEP 7b` | parseState (redirectTo, hasOrgId) |
| `[CQ Callback] STEP 8` | SUCCESS (targetUrl, locationId) |
| `[CQ Callback] STEP 9` | Cookie set (domain, path) |
| `[CQ Session]` | getSession (no cookie / cookie present but invalid); verifySessionToken (valid with locationId / invalid payload / invalid or expired) |
| `[CQ Middleware]` | request (pathname, isDashboard); → ALLOW (session valid / API with locationId / setup); → 401; → NO SESSION; → REDIRECT (authorize / open-from-ghl) |
| `[CQ Dashboard layout]` | getSession result (hasSession, locationId) |
| `[CQ open-from-ghl]` | getSession result (hasSession, willRedirect) |
| `[CQ OAuth status]` | check (locationId, installed, hasToken); or no locationId / error |
| `[CQ Decrypt]` | request (type, isArray, hasValue); GHL_APP_SSO_KEY; success (locationId); returning context; error |
| `[CQ iframe-context]` | store (locationId); stored OK; or no locationId / error |

### Browser console (live site) — filter by `CQ`

| Log prefix | When it runs |
|------------|----------------|
| `[CQ Iframe]` | context resolution start (isInIframe, pathname, hasReferrer); locationId resolved (URL/path/referrer) or from sessionStorage or from decrypt (postMessage); in iframe: sending REQUEST_USER_DATA; REQUEST_USER_DATA_RESPONSE received; TIMEOUT: no locationId after 6s |
| `[CQ OAuth]` | oauth-success: page load (success, locationId, error, isSuccess); countdown started; auto-redirect to /dashboard; open-from-ghl: session present → redirect or no session → instructions; DashboardGate: path= setup → allow or no session → replace open-from-ghl; DashboardGHLWrapper: not in iframe → replace or in iframe → show dashboard; setup: starting OAuth install |

### Legacy prefixes (still present)

| Search for            | When it runs |
|-----------------------|--------------|
| `[OAuth Authorize]`   | When you hit “Install” and we redirect to GHL. |
| `[OAuth Callback]`    | When GHL redirects back; use `[CQ Callback] STEP` for step-by-step. |
| `[OAuth Middleware]`  | Dashboard requests; use `[CQ Middleware]` for clear → ALLOW / → REDIRECT. |

## 3. What to look for

- **Callback never runs**  
  No `[OAuth Callback]` in logs after you approve in GHL → redirect URI mismatch. Compare `Redirect URI` in `[OAuth Authorize]` with the callback URL configured in the GHL Marketplace app (must match exactly).

- **Callback runs but “NO LOCATION ID”**  
  Log shows `❌ NO LOCATION ID`. Fix: start install from `/dashboard/setup` with the app opened from a GHL **location** (not agency) so we get `locationId` in state or from the token.

- **Callback runs, “COOKIE SET”, but you still see open-from-ghl**  
  Cookie is set in the tab that completed the callback. If you then open `/dashboard` in a **different tab** or **iframe**, the browser may not send the cookie (e.g. third‑party or different context).  
  Fix: after OAuth, use “Go to Dashboard” in the **same tab** that shows oauth-success, or open `/api/debug/oauth` in that same tab and confirm `sessionValid: true`.

- **Middleware always “NO SESSION”**  
  Either the cookie isn’t being set (check callback logs for `COOKIE SET` and `domain=`) or it isn’t sent on the next request (different tab/iframe). Use `/api/debug/oauth` in the same tab that did the callback to confirm.

## 4. Env vars that must match GHL

- `GHL_REDIRECT_URI` or the computed value must **exactly** match the “Callback URL” in the GHL Marketplace app (e.g. `https://cleanquote.io/api/auth/oauth/callback`).
- `APP_BASE_URL` (or Vercel URL) is used as the base for the redirect to `/oauth-success`; it should be your app’s public URL (e.g. `https://cleanquote.io`).
