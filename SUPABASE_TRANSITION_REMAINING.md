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

---

## One-time: Migrate existing KV settings to Supabase (user/org)

If you had config in Vercel KV (global or tool-scoped) and want it in Supabase so the dashboard and app use it:

1. Ensure `.env.local` has:
   - `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `KV_REST_API_URL`, `KV_REST_API_TOKEN` (e.g. from `vercel env pull`)

2. Run the migration script:
   ```bash
   node scripts/migrate-kv-config-to-supabase.mjs
   ```
   This script:
   - Reads config from KV (global keys, and tool-scoped keys for the default tool if present).
   - Writes to Supabase `tool_config`: one global row (`tool_id = null`) and one row for the tool with slug **default** (so the dashboard sees your user/org settings when you open that tool).

3. To target a different tool slug (e.g. your org’s tool):
   ```bash
   MIGRATE_TOOL_SLUG=your-slug node scripts/migrate-kv-config-to-supabase.mjs
   ```

4. After running, the dashboard will read config from Supabase for that tool; no code change required.

5. To migrate **all tools** in one run (ensure every tool has config from KV in Supabase):
   ```bash
   MIGRATE_ALL_TOOLS=1 node scripts/migrate-kv-config-to-supabase.mjs
   ```
   This reads global KV and each tool’s `tool:${id}:*` keys, then upserts one `tool_config` row per tool. Tools with no KV config are skipped (existing Supabase row is not overwritten with nulls).
