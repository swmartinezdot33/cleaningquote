# Supabase setup for multi-tenant quoting platform

This app uses Supabase for **Auth** (user login/signup) and the **tools** table (one row per quoting tool per user). Use either the Supabase Dashboard or the [Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp) to create the project and run the migration.

---

## 1. Create a Supabase project

- Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project (or use an existing one).
- Or, if you use the **Supabase MCP** in Cursor, use the MCP tool to spin up a new project.

Note the project URL and keys:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the client)

---

## 2. Run the tools table migration

Apply the migration that creates the `tools` table and RLS policies.

### Option A: Supabase Dashboard

1. In the Supabase Dashboard, open **SQL Editor**.
2. Paste the contents of [supabase/migrations/00001_create_tools_table.sql](supabase/migrations/00001_create_tools_table.sql).
3. Run the query.

### Option B: Supabase MCP

If the Supabase MCP is connected in Cursor, you can use it to run the migration (e.g. apply migration or execute SQL) against your project.

### Option C: Supabase CLI

If you use the Supabase CLI and link this repo:

```bash
supabase db push
```

---

## 3. Environment variables

Add these to `.env.local` (and to Vercel → Settings → Environment Variables for production):

```env
# Supabase (multi-tenant auth + tools table)
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

---

## 4. Optional: one-time migration (Option B)

To turn your **current single-tenant** setup into the first user’s first tool (slug `default`), run the migration script once after the `tools` table exists and Auth is configured:

- See [MULTI_TENANT_PLAN.md](MULTI_TENANT_PLAN.md) for the migration steps.
- Set `MIGRATION_USER_EMAIL` and `MIGRATION_USER_PASSWORD` (and optionally `MIGRATION_DEFAULT_SLUG`) in env, then run the migration API or script. This creates one user, one tool with slug `default`, and copies all existing KV keys into `tool:{toolId}:*`.

---

## 5. Enabling Supabase MCP in Cursor

To use the Supabase MCP for creating projects, running SQL, or managing the database from Cursor:

1. In Cursor, open **Settings** → **MCP** (or the MCP configuration file).
2. Add the Supabase MCP server, for example:
   ```json
   {
     "mcpServers": {
       "supabase": {
         "url": "https://mcp.supabase.com/mcp"
       }
     }
   }
   ```
3. When prompted, log in to your Supabase account so the MCP can access your projects.

After that, you can ask the AI to create projects, run migrations, or query data via the MCP.
