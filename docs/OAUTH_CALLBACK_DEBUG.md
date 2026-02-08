# OAuth callback debugging — why wrong locationId?

Use this to see **why** the callback stored a given location and fix "wrong location" issues.

## 1. Success page debug (no server access)

After a successful install, the callback shows a **"Debug — why this location"** section. Open it to see:

- **Token response keys** — Exact keys GHL returned (e.g. `access_token, refresh_token, companyId, userId`). If `locationId` or `location_id` is missing, the token was Company-level (agency install).
- **userType** — `Company` (agency) or `Location` (sub-account). Only `Location` tokens include `locationId` in the body.
- **locationId in token body** — yes/no. If **no**, we fall back to JWT → state → API.
- **State had locationId** — Whether the redirect URL included our state with `locationId` (from the iframe Connect link). If **yes** and token had no locationId, we use state so the right location is stored.
- **Source used** — `token` | `jwt` | `state` | `api`. If you see `api`, we used the first location from `/locations/` (often wrong for multi-location). If you see `state`, we used the iframe’s location from state.

**What to check when the location is wrong:**

- If **Source used: api** and **State had locationId: no** → GHL is not returning our state (e.g. user clicked Back and installed from marketplace). Fix: ensure users complete install from the Connect link so state is present, or re-add a cookie fallback.
- If **Source used: api** and **State had locationId: yes** → Bug: we should prefer state over API. Check server logs for "Using locationId from state".
- If **locationId in token body: no** and **userType: Company** → Agency-level install; we rely on state or API. State must be present when opening from the iframe.

---

## 2. Server logs (local)

With the app running locally:

```bash
npm run dev
```

1. Open the app from the GHL iframe (or `http://localhost:3000/dashboard?locationId=YOUR_LOCATION_ID`).
2. Click **Connect via OAuth** and complete the flow.
3. In the **terminal where `npm run dev` is running**, look for lines starting with `[CQ Connect Callback]` and `[CQ Authorize]`:

**Authorize (when you click Connect):**

- `[CQ Authorize] redirect URL built` — `stateLocationIdPreview` should be your iframe’s location (first 8 + last 4 chars).

**Callback (when GHL redirects back):**

- `[CQ Connect Callback] CALLBACK HIT` — `hasState: true/false`, `paramKeys` (should include `code`, `state`).
- `[CQ Connect Callback] State parsed` — `locationIdFromState` (preview or null), `stateRawLength`.
- `[CQ Connect Callback] Token exchanged` — `tokenResponseKeys`, `userType`, `locationIdInBody`.
- Then one of:
  - `locationId from token response`
  - `JWT decode attempt` → `Using locationId from state` or `Fetching /locations/ API fallback`
- `[CQ Connect Callback] locationId for KV` — final location and `source`.

If **State parsed** shows `locationIdFromState: null` but you started from the iframe with a locationId, state was lost (e.g. Back + marketplace install). If **Token exchanged** shows `locationIdInBody: false` and `userType: Company`, the token is agency-level and we need state or API.

---

## 3. Server logs (Vercel / production)

1. Vercel Dashboard → your project → **Logs** (or **Functions** → select a function → logs).
2. Filter by time around when you completed the install.
3. Search for `[CQ Connect Callback]` or `CALLBACK HIT` to find the callback run.
4. Use the same log lines as in §2 to see state, token keys, userType, and which source was used.

---

## 4. Quick local test (state parsing only)

To verify state parsing **without** a real token exchange:

1. Start dev: `npm run dev` (note the port if not 3000, e.g. 3003).
2. Build a state value:  
   `echo -n '{"locationId":"1uDcMtL7LgPvpYwaQtdq","redirect":"/oauth-success"}' | base64`  
   Result: `eyJsb2NhdGlvbklkIjoiMXVEY010TDdMZ1B2cFl3YVF0ZHEiLCJyZWRpcmVjdCI6Ii9vYXV0aC1zdWNjZXNzIn0=`
3. Open (will fail token exchange but will log state):  
   `http://localhost:PORT/api/auth/connect/callback?code=fake&state=eyJsb2NhdGlvbklkIjoiMXVEY010TDdMZ1B2cFl3YVF0ZHEiLCJyZWRpcmVjdCI6Ii9vYXV0aC1zdWNjZXNzIn0=`
4. In the terminal you should see:
   - `[CQ Connect Callback] CALLBACK HIT` with `hasState: true`
   - `[CQ Connect Callback] State parsed` with `locationIdFromState: '1uDcMtL7..Qtdq'`
   - Then `Token exchange failed` (expected). So state parsing is correct; if production still gets wrong location, GHL is likely not sending state back or the token has no locationId and state is missing.

---

## 5. Checklist when the stored location is wrong

- [ ] Open **Debug — why this location** on the success page. Note **Source used** and **State had locationId**.
- [ ] Check server logs for `[CQ Connect Callback]` and confirm **State parsed** and **Token exchanged**.
- [ ] If **Source used: api** → we used first location from `/locations/`. Either state was missing (state not in callback URL) or token had no locationId and state wasn’t parsed.
- [ ] If **State had locationId: no** → Connect link or GHL redirect is not passing state. Ensure Connect uses `/api/auth/oauth/authorize?locationId=...&redirect=...` and that you don’t complete install via a path that drops state (e.g. Back then Install from marketplace).
- [ ] If **userType: Company** and **locationId in token body: no** → GHL returns Company-level token; we **must** have state (iframe location) to store the correct location.
