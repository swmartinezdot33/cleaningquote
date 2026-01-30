# Multi-tenant white-label quoting platform — implementation plan

This document locks in **Option B** for data migration (Section 6) and adds concrete migration steps.

---

## 6. Data migration — Option B (chosen)

**Approach:** Migrate existing production setup into the first user and first tool so current behavior is preserved without re-entering config.

### Migration steps

1. **Create migration script or one-time API route** (e.g. `scripts/migrate-to-multitenant.mjs` or `POST /api/admin/migration/to-multitenant`) that:
   - Runs only when no tools exist in Supabase (or when env `RUN_MIGRATION=true`).
   - Creates one **user** in Supabase Auth:
     - Either use a seed email/password from env (e.g. `MIGRATION_USER_EMAIL`, `MIGRATION_USER_PASSWORD`), or
     - Create a system/first user and set a temporary password the admin must change on first login.
   - Creates one **tool** in the `tools` table: `user_id` = that user, `name` = e.g. "Default quoting tool", `slug` = `default` (or a slug from env like `MIGRATION_DEFAULT_SLUG`).
   - Copies all **current global KV keys** into tool-scoped keys for that tool’s `id`:
     - `pricing:file:2026` → `tool:{toolId}:pricing:file:2026`
     - `pricing:data:table` → `tool:{toolId}:pricing:data:table`
     - `ghl:api:token` → `tool:{toolId}:ghl:api:token`
     - `ghl:location:id` → `tool:{toolId}:ghl:location:id`
     - `ghl:config` → `tool:{toolId}:ghl:config`
     - `widget:settings` → `tool:{toolId}:widget:settings`
     - `survey:questions:v2` (and `survey:questions` if used) → `tool:{toolId}:survey:questions:v2`
     - `service:area:polygon` → `tool:{toolId}:service:area:polygon`
     - `service:area:network:link` → `tool:{toolId}:service:area:network:link`
     - `admin:form-settings` → `tool:{toolId}:form-settings`
     - `admin:initial-cleaning-config` → `tool:{toolId}:initial-cleaning-config`
     - `admin:tracking-codes` → `tool:{toolId}:tracking-codes`
     - `admin:google-maps-api-key` → `tool:{toolId}:google-maps-api-key`
     - Any other keys used in [src/lib/kv.ts](src/lib/kv.ts) and related APIs (e.g. `pricing:network:path`) under the same pattern.
   - Does **not** delete the old keys until a later “cutover” step (allows rollback).

2. **Post-migration cutover (optional, after verification):**
   - After confirming the app works with tool-scoped keys for the default tool, run a second step (or env-triggered) that deletes the old global keys, or leave them in place as backup and document that they are unused.

3. **Root and default tool behavior:**
   - Root `/` redirects to `/t/default` (so existing bookmarks and widget without `data-tool` can be updated to use `default` or we support both: if no slug, redirect to `default`).
   - Widget: if `data-tool` is omitted, default to slug `default` so existing embeds keep working until customers add the attribute.

4. **First user credentials:**
   - Document in ADMIN_SETUP or ENVIRONMENT_VARIABLES: set `MIGRATION_USER_EMAIL` and `MIGRATION_USER_PASSWORD` (and optionally `MIGRATION_DEFAULT_SLUG`) before running migration; after first login, user should change password.

### Implementation order (migration in the sequence)

- After **Supabase + Auth + `tools` table** and **tool-scoped KV layer** are in place:
  1. Run migration script/route once to create first user, first tool, and copy KV keys.
  2. Point `/` to redirect to `/t/default` (or serve `/t/default` at `/` for a transition period).
  3. Ensure widget defaults to slug `default` when `data-tool` is missing.
  4. Later: remove or redirect legacy `/admin` to `/dashboard/tools/{defaultToolId}/settings` (or similar) and deprecate global KV keys.

---

## Rest of plan (unchanged)

Sections 1–5 and 7–8 of the original plan remain as previously described:

- **1. Auth and user model (Supabase)** — Supabase Auth, `tools` table, auth middleware.
- **2. Tool-scoped storage (KV)** — Keys `tool:{toolId}:*`, tool-aware KV API, per-tool pricing cache, survey manager with `toolId`.
- **3. Dashboard** — Tool list, create tool, per-tool settings/survey/pricing; admin APIs take `toolId` and validate ownership.
- **4. Public routes and APIs by tool** — `/t/[slug]`, `/t/[slug]/quote/[id]`, slug-scoped public APIs, quote POST/GET with tool context.
- **5. Widget** — `data-tool` (default `default`), slug-based URLs and API calls.
- **7. Implementation order** — Same sequence, with migration (Option B) run after tool-scoped KV and first tool creation flow exist.
- **8. Out of scope** — Custom domains, organizations, billing.

This locks in **Option B** and makes the migration steps explicit for implementation.
