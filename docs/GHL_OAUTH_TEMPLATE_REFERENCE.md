# GHL OAuth — Official Template & API Reference

This doc ties our implementation to **official sources** so we don’t guess.

## Sources

- **Template:** [GoHighLevel/ghl-marketplace-app-template](https://github.com/GoHighLevel/ghl-marketplace-app-template) (Express + TypeScript)
- **OAuth API spec:** `highlevel-api-docs` (local: `~/highlevel-api-docs/apps/oauth.json`, [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com/docs/ghl/oauth/get-access-token))
- **Scopes:** `highlevel-api-docs/docs/oauth/Scopes.md` — contacts = Sub-Account; oauth.readonly/oauth.write = Agency

## Template flow (verbatim)

1. **authorize-handler**  
   - Receives `code` from GHL redirect.  
   - `POST /oauth/token` with `client_id`, `client_secret`, `grant_type=authorization_code`, `code`.  
   - `saveInstallationInfo(resp.data)` — keys by **locationId** if present, else **companyId**.

2. **example-api-call (company)**  
   - Uses token stored for **companyId** (company-level APIs, e.g. users).

3. **example-api-call-location (contacts)**  
   - If installation exists for **locationId** → use that token for `GET /contacts/?locationId=...`.  
   - **Else** → `getLocationTokenFromCompanyToken(companyId, locationId)`:  
     - Uses **company token** as Bearer to call `POST /oauth/locationToken` with `companyId`, `locationId`.  
     - Saves response with `saveInstallationInfo(res.data)` (response has locationId → stored under locationId).  
     - Then uses **location token** for `GET /contacts/?locationId=...`.  
   - So **contacts are always called with a location-scoped token**, never the company token.

## API spec (oauth.json)

- **GET /oauth/installedLocations** — Query params: **companyId** (required), **appId** (required). Response: `locations[]` with **\_id** (location id), name, address, isInstalled. Security: Agency token (oauth.readonly).
- **POST /oauth/locationToken** — Body: **companyId**, **locationId**. Security: Agency token (oauth.write). Returns location-scoped access_token.
- **POST /oauth/token** — Get Access Token (authorization_code or refresh_token). Response includes locationId and/or companyId, userType (Location | Company).

## Our alignment

| Step | Template | Us (cleaningquote) |
|------|----------|--------------------|
| Store install | By locationId or companyId from token response | KV by locationId; if Company user also store as “agency” token |
| Contacts API | Always use **location token** (from install or from POST /oauth/locationToken) | `getOrFetchTokenForLocation`: when we have agency token + companyId → POST /oauth/locationToken first; else KV (location install) |
| installedLocations | — | GET /oauth/installedLocations with **companyId** and **appId** (GHL_COMPANY_ID, GHL_CLIENT_ID); parse location from **\_id** or id |

## Env required for full flow

- **OAuth:** GHL_CLIENT_ID, GHL_CLIENT_SECRET, redirect URI in app settings.
- **Installed locations:** Agency token (env or KV from Company install) + **GHL_COMPANY_ID** + **GHL_CLIENT_ID** (as appId).
- **Location token for contacts:** Same agency token + **GHL_COMPANY_ID** for POST /oauth/locationToken.
