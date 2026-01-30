# Multi-Tenant Platform — Production Checklist

Use this checklist to get the multi-tenant quoting platform running in **production** (e.g. on Vercel).

---

## 1. Supabase

- [ ] **Project created** at [supabase.com/dashboard](https://supabase.com/dashboard).
- [ ] **Tools table** migration applied (SQL Editor → run `supabase/migrations/00001_create_tools_table.sql` or equivalent).
- [ ] **Auth → URL configuration** (Supabase Dashboard):
  - **Site URL**: `https://your-production-domain.com`
  - **Redirect URLs**: add:
    - `https://your-production-domain.com/auth/callback`
    - `https://your-production-domain.com/**`
  (Replace with your real Vercel/production URL.)
- [ ] **Env vars** set in Vercel (see [Environment variables](#environment-variables) below).

---

## 2. Vercel

- [ ] **Project** connected to your Git repo; deploys on push to `main` (or your production branch).
- [ ] **KV (Redis)** created and linked in Vercel → Storage so `KV_REST_API_URL` and `KV_REST_API_TOKEN` are injected.
- [ ] **Environment variables** set for **Production** (and Preview if you use preview deploys).

---

## 3. Environment variables

Set these in **Vercel → Project → Settings → Environment Variables** for **Production**:

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only; never expose to client |
| `KV_REST_API_URL` | ✅ | Auto-injected when KV is linked |
| `KV_REST_API_TOKEN` | ✅ | Auto-injected when KV is linked |
| `ADMIN_PASSWORD` | ✅ | Strong password for legacy admin and migration |
| `JWT_SECRET` | Recommended | Strong random secret (e.g. `openssl rand -hex 32`) |
| `GOOGLE_MAPS_API_KEY` | Optional | If using address autocomplete |
| `MIGRATION_USER_EMAIL` | For migration | First user email (can remove after migration) |
| `MIGRATION_USER_PASSWORD` | For migration | First user password (user should change on first login) |
| `MIGRATION_SECRET` | Optional | For `x-migration-secret` when calling migration API |

See [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) for full reference.

---

## 4. One-time migration (first user + default tool)

If this is the **first** production deploy and you want to create the first user and copy existing global KV config into the first tool:

1. Set `MIGRATION_USER_EMAIL` and `MIGRATION_USER_PASSWORD` (and optionally `MIGRATION_DEFAULT_SLUG`, e.g. `default`) in Vercel.
2. Deploy (or use a preview deploy).
3. Run the migration once:
   ```bash
   curl -X POST https://your-production-domain.com/api/admin/migration/to-multitenant \
     -H "x-admin-password: YOUR_ADMIN_PASSWORD"
   ```
   Or use `x-migration-secret` if you set `MIGRATION_SECRET`.
4. First user can log in at `https://your-production-domain.com/login` with the migration email/password; change password after first login.
5. (Optional) Remove or rotate `MIGRATION_USER_PASSWORD` and `MIGRATION_SECRET` after migration.

Details: [MIGRATION_OPTION_B.md](MIGRATION_OPTION_B.md).

---

## 5. Post-deploy verification

- [ ] **Health check**: `GET https://your-production-domain.com/api/health` returns `200` and `{"ok":true,...}`.
- [ ] **Login**: Open `https://your-production-domain.com/login`, sign in with the first user; redirect to dashboard.
- [ ] **Dashboard**: Tool list and tool settings (e.g. GHL, survey, pricing) load without errors.
- [ ] **Quote flow**: Open `https://your-production-domain.com/t/default` (or your slug); run through survey and confirm quote calculation.
- [ ] **Widget**: If you use the embed, test with `data-tool="default"` (or your slug) on your production domain.

---

## 6. Optional: custom domain and security

- [ ] **Custom domain**: Vercel → Settings → Domains → add domain and configure DNS.
- [ ] **Supabase redirect URLs**: After adding a custom domain, add its callback URL to Supabase Auth redirect URLs.
- [ ] **Admin password**: Use a strong `ADMIN_PASSWORD`; consider rotating quarterly.
- [ ] **JWT_SECRET**: Set a strong value different from `ADMIN_PASSWORD`; rotate periodically.

---

## Quick reference

| What | URL |
|------|-----|
| Health | `GET /api/health` |
| Login | `/login` |
| Dashboard | `/dashboard` |
| Default tool (quote flow) | `/t/default` (or your slug) |
| Auth callback | `/auth/callback` |

**Build locally before deploy:** `npm run build`

**Deploy:** Push to `main` (if using Vercel Git integration) or `vercel --prod`.
