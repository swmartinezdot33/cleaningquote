# Migration Option B — First user and default tool

This document describes how to run the **Option B** migration: create the first user and first quoting tool, and copy all existing global KV config into that tool so current production behavior is preserved.

## Prerequisites

- Supabase project created; `tools` table migration applied ([SUPABASE_MULTITENANT_SETUP.md](SUPABASE_MULTITENANT_SETUP.md)).
- Vercel KV (or Upstash Redis) with existing global keys (pricing, GHL, widget, survey, etc.).
- Environment variables set (see below).

## Environment variables

Set before running the migration:

| Variable | Required | Description |
|----------|----------|-------------|
| `MIGRATION_USER_EMAIL` | Yes | Email for the first user (e.g. `admin@yourcompany.com`) |
| `MIGRATION_USER_PASSWORD` | Yes | Password for the first user; change on first login |
| `MIGRATION_DEFAULT_SLUG` | No | Slug for the default tool (default: `default`) → `/t/default` |
| `RUN_MIGRATION` | No | Set to `true` to re-run and re-copy KV into the first tool if tools already exist |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `KV_REST_API_URL` | Yes | Vercel KV REST API URL |
| `KV_REST_API_TOKEN` | Yes | Vercel KV REST API token |

See [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) for full reference.

## Option 1: Run the script (Node)

1. From the project root, ensure env is loaded (e.g. copy `.env.local` or export variables).
2. Run:

   ```bash
   node scripts/migrate-to-multitenant.mjs
   ```

3. If tools already exist, the script exits unless `RUN_MIGRATION=true`. With `RUN_MIGRATION=true`, it re-copies global KV keys into the first existing tool.
4. After first login, the user should change their password.

## Option 2: Call the API route

1. Deploy the app (or run locally) with the migration env vars set.
2. Call the migration endpoint with one of:
   - Header `x-admin-password` = your `ADMIN_PASSWORD`, or
   - Header `x-migration-secret` = your `MIGRATION_SECRET` (if set), or
   - Env `RUN_MIGRATION=true` (then no header needed).

   ```bash
   curl -X POST https://your-app.vercel.app/api/admin/migration/to-multitenant \
     -H "x-admin-password: YOUR_ADMIN_PASSWORD"
   ```

3. Response includes `toolId`, `slug`, and `keysCopied`. First user can sign in at `/login` with `MIGRATION_USER_EMAIL` / `MIGRATION_USER_PASSWORD`.

## What gets copied

All current global KV keys are copied to `tool:{toolId}:<key>`:

- `pricing:file:2026` and `pricing:file:2026:metadata`
- `pricing:network:path`, `pricing:data:table`
- `ghl:api:token`, `ghl:location:id`, `ghl:config`
- `widget:settings`, `admin:form-settings`
- `survey:questions`, `survey:questions:v2`
- `service:area:polygon`, `service:area:network:link`
- `admin:initial-cleaning-config`, `admin:tracking-codes`, `admin:google-maps-api-key`

**Old global keys are not deleted** so you can roll back if needed. A later cutover step can remove them after verification.

## After migration

- **Root `/`** redirects to `/t/default` (or your `MIGRATION_DEFAULT_SLUG`).
- **Widget** without `data-tool` defaults to slug `default` so existing embeds keep working.
- First user signs in at **`/login`** and sees the dashboard with one tool (default).
- Survey URL: **`/t/default`** (or `/t/{MIGRATION_DEFAULT_SLUG}`).

## Troubleshooting

- **"Tools already exist"**  
  Set `RUN_MIGRATION=true` to re-copy KV into the first tool.
- **"Missing MIGRATION_USER_EMAIL"**  
  Set both `MIGRATION_USER_EMAIL` and `MIGRATION_USER_PASSWORD` in env.
- **Supabase "Failed to create user"**  
  User may already exist; script will reuse that user and create the tool.
- **KV copy errors**  
  Ensure `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set and valid.
