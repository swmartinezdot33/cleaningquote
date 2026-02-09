# Data sources: Supabase vs GoHighLevel (GHL)

This document describes where data lives and how the dashboard loads it so the team stays aligned.

## Summary

- **Supabase** holds only **config**: service areas, pricing structures, tools, tool config, pricing associations, and related settings. It is the source of truth for product configuration — nothing else.
- **GoHighLevel (GHL)** is **everything else**: contacts, pipelines (opportunities), calendars, appointments, and all other CRM/operational data. We do not duplicate this in Supabase; we read and write it via the **GHL API** using the existing connection (location token, `resolveGHLContext`).

## Lookup key: location ID

- The dashboard resolves **location** from user context; that drives which org (and thus which config) is shown.
- **User context:** When the app loads inside the GHL iframe, we get `locationId` from the decrypted postMessage (`REQUEST_USER_DATA_RESPONSE`). That `locationId` is the **key** for all lookups.
- **Lookup rule:** The dashboard resolves `locationId` from user context (header, query, or session), then:
  - Resolves **org** via `org_ghl_settings.ghl_location_id` (and tools with `tool_config.ghl_location_id`). One org = one GHL location.
  - Queries **Supabase** config by **org_id** (service areas, pricing structures) or by `tool_config.ghl_location_id` (tools list).
  - Calls the **GHL API** for contacts, pipelines, calendars, appointments, and all other CRM/operational data.

So: **Supabase = config only, keyed by locationId; GHL = everything else; locationId from user context drives all lookups.** The iframe dashboard should feel like a single GHL page.

## Org = GHL sub-account (location)

The app only loads inside the GHL iframe, so **one org in Supabase = one GHL sub-account (location)**. We keep the `organizations` table as the Supabase bucket for that location (tools, service areas, pricing structures still reference `org_id` for FKs and RLS). There is no separate “org” concept in the UI when in GHL: the user’s scope is always the current `locationId` from postMessage. We resolve “the org for this location” via `getOrgIdsByGHLLocationId(locationId)` and, when none exists, **auto-provision** one org and link it in `org_ghl_settings` so the location has exactly one org. No org switcher in GHL context; everything is scoped by `locationId`.

## Supabase (config only)

- **Tables:** `tool_config`, `org_ghl_settings`, `pricing_structures`, `service_areas`, tools, pricing associations, etc.
- **Convention:** Config is scoped by **org_id**. The org for the current location is resolved via `org_ghl_settings.ghl_location_id` (and tools’ `tool_config.ghl_location_id`). Service areas and pricing structures have no `ghl_location_id` column; they are scoped only by `org_id`.
- **Writes:** When creating or updating service areas or pricing structures, set `org_id` (the org resolved for the current location). No `ghl_location_id` on those tables.

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
