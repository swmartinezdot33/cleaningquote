# Migration checklist — Clean Quote

Use this after you’ve run the SQL in your **Clean Quote** Supabase project.

## 1. Get values from Supabase (Clean Quote)

- **Dashboard:** https://supabase.com/dashboard → open **Clean Quote** project  
- **Project URL:** Settings → API → **Project URL** → copy to `NEXT_PUBLIC_SUPABASE_URL`  
- **Service role key:** Settings → API → **Project API keys** → **service_role** (secret) → copy to `SUPABASE_SERVICE_ROLE_KEY`  
- **Anon key:** same page → **anon** public → copy to `NEXT_PUBLIC_SUPABASE_ANON_KEY` (needed for app auth)

## 2. Add to `.env.local`

```bash
# Supabase (Clean Quote project)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Migration (first dashboard user)
MIGRATION_USER_EMAIL=admin@yourcompany.com
MIGRATION_USER_PASSWORD=YourSecurePassword

# Vercel KV (already in project)
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

Replace `YOUR_PROJECT_REF`, the keys, email, and password with your real values.

## 3. Run the migration

**Option A — Script (recommended)**

```bash
npm run migrate
```

Or: `node scripts/migrate-to-multitenant.mjs`

The script loads `.env.local` from the project root. You should see: created user, created tool, “Copied: …” for each key, then “Done. Copied N keys to tool: …”.

**Option B — API (e.g. production)**

With the app deployed and env vars set (including `MIGRATION_USER_EMAIL`, `MIGRATION_USER_PASSWORD`), call:

```bash
curl -X POST https://your-domain.com/api/admin/migration/to-multitenant \
  -H "x-migration-secret: YOUR_MIGRATION_SECRET"
```

Or set `RUN_MIGRATION=true` (and optionally `MIGRATION_SECRET`) in env and send the request; or use `x-admin-password` with your `ADMIN_PASSWORD` if set.

## 4. After migration

- Sign in at **/login** with `MIGRATION_USER_EMAIL` / `MIGRATION_USER_PASSWORD` (change password on first login).
- Default survey: **/t/default**. Root **/** redirects to `/t/default`.
- Widget: if `data-tool` is omitted, slug **default** is used so existing embeds keep working.

If the script says “Tools already exist”, set `RUN_MIGRATION=true` in `.env.local` and run it again to re-copy KV into the first tool.
