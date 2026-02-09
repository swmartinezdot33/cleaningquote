# Data sources: Supabase vs GoHighLevel (GHL)

This document describes where data lives and how the dashboard loads it so the team stays aligned.

## Summary

- **Supabase** holds only **config**: service areas, pricing structures, tools, tool config, pricing associations, and related settings. It is the source of truth for product configuration — nothing else.
- **GoHighLevel (GHL)** is **everything else**: contacts, pipelines (opportunities), calendars, appointments, and all other CRM/operational data. We do not duplicate this in Supabase; we read and write it via the **GHL API** using the existing connection (location token, `resolveGHLContext`).

## Lookup key: location ID

- Every Supabase row the dashboard needs is keyed by **location** (e.g. `ghl_location_id`) so we can always filter by the current user’s location.
- **User context:** When the app loads inside the GHL iframe, we get `locationId` from the decrypted postMessage (`REQUEST_USER_DATA_RESPONSE`). That `locationId` is the **key** for all lookups.
- **Lookup rule:** The dashboard resolves `locationId` from user context (header, query, or session), then:
  - Queries **Supabase** filtered by `ghl_location_id` (or via `org_ghl_settings` / `tool_config`) for config.
  - Calls the **GHL API** for contacts, pipelines, calendars, appointments, and all other CRM/operational data.

So: **Supabase = config only, keyed by locationId; GHL = everything else; locationId from user context drives all lookups.** The iframe dashboard should feel like a single GHL page.

## Supabase (config only)

- **Tables:** `tool_config`, `org_ghl_settings`, `pricing_structures`, `service_areas`, tools, pricing associations, etc.
- **Convention:** New dashboard-backed tables should include `ghl_location_id` (or equivalent) and APIs should filter by it.
- **Writes:** When creating or updating location-scoped rows (e.g. pricing structure, service area), set `ghl_location_id` from the current request context so lookups by locationId return that row.

## GHL (everything else)

- **Data:** Contacts, pipelines, opportunities, calendars, appointments, conversations, and all other CRM/operational data.
- **Access:** Via `resolveGHLContext`, `src/lib/ghl/client.ts`, and dashboard APIs that accept `x-ghl-location-id` and/or `?locationId=` and call the GHL API.

## Null locationId and UI

When the dashboard loads inside the GHL iframe, `locationId` may be unavailable briefly (postMessage not yet received) or missing (e.g. opened outside iframe). To avoid console errors and broken UI:

- **Guard all reads** of `effectiveLocationId` or `userContext?.locationId`: use optional chaining, early return, or a loading / “No location” state instead of assuming a value.
- **Hooks:** `useEffectiveLocationId()` and `useGHLUserContext()` can return `null`; document this and guard in consumers (see `src/lib/ghl-iframe-context.tsx`).

## References

- Plan: `.cursor/plans/supabase_vs_ghl_architecture_alignment_*.plan.md`
- Config/store: `src/lib/config/store.ts` — `getOrgIdsByGHLLocationId`, `getToolIdsByGHLLocationId`
- GHL context/client: `src/lib/ghl/api-context.ts`, `src/lib/ghl/client.ts`
- Iframe/dashboard API: `src/lib/ghl-iframe-context.tsx`, `src/lib/dashboard-api.ts`
