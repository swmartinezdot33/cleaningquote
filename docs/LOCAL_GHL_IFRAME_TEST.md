# Testing GHL user context locally

You can test the “user context → KV” flow locally **without** being inside a real GoHighLevel iframe. The app resolves `locationId` from the URL first, so you can pass it in the query.

## 1. Direct URL (simplest)

With the dev server running (`npm run dev`), open:

```text
http://localhost:3000/dashboard?locationId=YOUR_LOCATION_ID
```

Replace `YOUR_LOCATION_ID` with a real GHL location id (e.g. from your sub-account URL in GHL: `.../location/ve9EPM428h8vShlRW1KT/...`).

- **Middleware**: On localhost, the app allows `/dashboard` when `locationId` is in the query (no redirect to “Open from GHL”).
- **Context**: The client reads `locationId` from the URL and sends it on all dashboard API calls (query + `x-ghl-location-id` header).
- **KV**: The server looks up that `locationId` in KV. If you’ve completed OAuth for that location, you’ll see “Connected”; otherwise “Not connected” and you can run **Test connection** and use the debug logs to see why context and KV don’t match.

## 2. Simulated iframe (same as GHL loading the app)

To simulate the app being loaded **inside** an iframe (like GHL does):

1. Open the test page:
   ```text
   http://localhost:3000/test-ghl-iframe.html
   ```
2. Enter your **Location ID** (same as above).
3. Click **Load dashboard in iframe**.

The iframe’s `src` will be `http://localhost:3000/dashboard?locationId=...`, so the app still gets user context from the URL. The only difference from (1) is that the app runs inside an iframe (e.g. `window.self !== window.top`).

## 3. After OAuth (session)

Once you’ve completed OAuth for a location (e.g. by starting from the URL in (1) and going through “Connect” / authorize), the server sets a session cookie. You can then open:

```text
http://localhost:3000/dashboard
```

with **no** `locationId` in the URL; the app will use the session’s `locationId` for API calls and KV lookup.

## Getting a real Location ID

- In GHL, open a **sub-account** (location).
- The URL looks like: `https://app.gohighlevel.com/v2/location/ve9EPM428h8vShlRW1KT/...`
- The segment after `/location/` is the **Location ID** (e.g. `ve9EPM428h8vShlRW1KT`). Use it exactly (case-sensitive).

## Debugging “user context vs KV” mismatch

1. Use (1) or (2) with a known `locationId`.
2. Open the CRM page and click **Test connection**.
3. Check the UI: **User context: Location ID = …** and **KV lookup: … → token in KV: Yes/No**.
4. Server-side debug logs (if enabled) write to `.cursor/debug.log` with:
   - `source`: query vs header vs none
   - `locationIdSource`: request vs session
   - `trimDiff`: whether the request id had leading/trailing space
   - `storedVsRequested`: whether the KV record’s `locationId` matches the one we looked up

That will show whether the mismatch is from missing context, wrong id format, or a different id stored at OAuth callback vs the one you’re sending.
