# KV → Supabase Transition (Complete)

## Current state

- **Config (pricing, survey, widget, GHL, form, tracking, service area, etc.)** – **Supabase-only.** All config in `src/lib/kv.ts` and `src/lib/survey/manager.ts` calls `requireSupabaseForConfig()` and uses the config store. No KV fallback. Migration and clone routes return 503 if Supabase is not configured.
- **Quote data** – Stored in Supabase; KV is used only as an optional cache (`quote:${id}` with TTL).
- **Auth (sessions, rate limiting)** – Stored in KV in `src/lib/security/auth.ts`. Unchanged.
- **Inbox meta** – `inbox:meta:*` in KV. Unchanged.

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

---

## Anything else?

**Required for deployment**

- Set **Supabase** in every environment (Vercel, local, etc.):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Set **KV** in every environment (still used for inbox meta, auth, optional quote cache):
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN`

**Optional**

- **Docs:** Update `ENVIRONMENT_VARIABLES.md` or `PRODUCTION_READINESS.md` to state that Supabase is required for config (not optional).
- **Migration script:** Keep `scripts/migrate-kv-config-to-supabase.mjs` for one-time migration from existing KV; safe to remove from the repo after all envs are migrated and you no longer need it.
- **Legacy scripts:** `copy-global-kv-to-default-tool.mjs`, `migrate-to-multitenant.mjs` target KV; they’re obsolete for config copy (use dashboard clone or to-multitenant API instead). You can archive or delete them if you don’t need KV-based migration anymore.
