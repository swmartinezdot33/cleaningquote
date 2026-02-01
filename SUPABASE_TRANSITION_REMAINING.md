# Finishing the KV → Supabase Transition

## Current state

- **Config (pricing, survey, widget, GHL, form, tracking, service area, etc.)** – `src/lib/kv.ts` already delegates to Supabase (`config/store`) when `isSupabaseConfigured()`. Reading/writing through `kv.ts` uses Supabase when configured.
- **Some dashboard API routes** still call `getKV()` and key names directly, so they **bypass** that logic and always use KV. Switching them to the `kv.ts` helpers completes the transition for config.
- **Quote data** – Stored in Supabase; KV is used only as an optional cache (`quote:${id}` with TTL). No change required unless you want to drop the KV quote cache.
- **Auth (sessions, rate limiting)** – Stored in KV in `src/lib/security/auth.ts`. Ephemeral/session data; fine to keep in KV unless you add a Supabase sessions table later.
- **Inbox meta** – `inbox:meta:*` in KV; Resend doesn’t support this. Stays in KV.

---

## Remaining work (config fully in Supabase when configured) — DONE

### 1. Dashboard routes — switched to `@/lib/kv`

- `api/dashboard/tools/[toolId]/initial-cleaning-config` – uses `getInitialCleaningConfig`, `setInitialCleaningConfig`.
- `api/dashboard/tools/[toolId]/google-maps-key` – uses `getGoogleMapsKey`, `setGoogleMapsKey`.
- `api/dashboard/tools/[toolId]/tracking-codes` – uses `getTrackingCodes`, `setTrackingCodes`.
- `api/dashboard/tools/[toolId]/pricing` – uses `getPricingTable`, `setPricingTable`, `clearPricingData`.
- `api/dashboard/tools/[toolId]/upload-pricing` – uses `setPricingTable` after parsing.

### 2. Pricing lib — switched

- `src/lib/pricing/calcQuote.ts` – `getInitialCleaningConfig()` now uses `getInitialCleaningConfig` from `@/lib/kv` (Supabase when configured).

### 3. Done: Supabase-only config, KV for cache/auth only

- **Config is Supabase-only.** All config reads/writes in `kv.ts` and survey/manager now call `requireSupabaseForConfig()` and use the config store only. No KV fallback. Migration and clone routes require Supabase (503 if not configured).
- **Quote cache** – KV is kept as optional cache for quote reads (`quote:${id}` with TTL). No change.
- **Auth** – Sessions and rate limits remain in KV. No change.
- **Inbox meta** – `inbox:meta:*` remains in KV. No change.

---

## After the switches above

- All **config** read/write will go through `kv.ts` (and thus Supabase when `NEXT_PUBLIC_SUPABASE_URL` + service role are set).
- **KV** remains only for: inbox meta, auth sessions/rate limiting, and optional quote cache.
