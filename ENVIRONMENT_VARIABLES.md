# Environment Variables Reference

**Last Updated:** January 29, 2026

This document lists all environment variables used by the Cleaning Quote Platform and how to configure them.

---

## Supabase (multi-tenant auth and tools)

### `NEXT_PUBLIC_SUPABASE_URL`
**Required:** Yes (for multi-tenant auth and dashboard)  
**Type:** URL String  
**Description:** Your Supabase project URL  
**Where to Set:** `.env.local` and Vercel → Environment Variables  
**Example:** `https://xxxxxxxx.supabase.co`

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
**Required:** Yes (for multi-tenant auth and dashboard)  
**Type:** String  
**Description:** Supabase anon (public) key; safe for client and SSR with RLS  
**Where to Set:** `.env.local` and Vercel → Environment Variables

### `SUPABASE_SERVICE_ROLE_KEY`
**Required:** Optional (for server-only tool resolution, e.g. getToolBySlug in scripts)  
**Type:** String  
**Description:** Supabase service role key; bypasses RLS. Never expose to the client.  
**Where to Set:** `.env.local` and Vercel → Environment Variables (server only)

See [SUPABASE_MULTITENANT_SETUP.md](SUPABASE_MULTITENANT_SETUP.md) for creating the project and running the `tools` table migration.

---

## Migration (Option B — first user and default tool)

Used by the migration script and API to create the first user and first quoting tool and copy existing global KV config into that tool.

### `MIGRATION_USER_EMAIL`
**Required:** For running migration  
**Type:** String  
**Description:** Email for the first user created by the migration  
**Where to Set:** `.env.local` and Vercel (temporarily, for migration)  
**Example:** `admin@yourcompany.com`

### `MIGRATION_USER_PASSWORD`
**Required:** For running migration  
**Type:** String  
**Description:** Password for the first user; user should change on first login  
**Where to Set:** `.env.local` and Vercel (temporarily, for migration)

### `MIGRATION_DEFAULT_SLUG`
**Required:** Optional  
**Type:** String  
**Description:** Slug for the default quoting tool (used at `/t/{slug}`). Default: `default`  
**Where to Set:** `.env.local`  
**Example:** `default` or `acme-cleaning`

### `RUN_MIGRATION`
**Required:** Optional  
**Type:** String  
**Description:** Set to `true` to allow migration to run even when tools already exist (re-copies KV into first tool)  
**Where to Set:** `.env.local` or request header / env when calling migration API

### `MIGRATION_SECRET`
**Required:** Optional  
**Type:** String  
**Description:** Secret for `x-migration-secret` header when calling `POST /api/admin/migration/to-multitenant`  
**Where to Set:** Vercel → Environment Variables

See [MIGRATION_OPTION_B.md](MIGRATION_OPTION_B.md) for full migration steps.

---

## Required Environment Variables

### `ADMIN_PASSWORD`
**Required:** ✅ Yes  
**Type:** String  
**Description:** Password for accessing the admin interface at `/admin`  
**Where to Set:** Vercel Dashboard → Settings → Environment Variables  
**Example:** `MySecureP@ssw0rd2026!`  
**Security:** 
- Use at least 16 characters
- Mix of uppercase, lowercase, numbers, and symbols
- Never commit to Git
- Store in secure password manager

**Usage:**
- Admin interface authentication
- All `/api/admin/*` endpoints require this in `x-admin-password` header

---

### `KV_REST_API_URL`
**Required:** ✅ Yes (if using KV storage)  
**Type:** URL String  
**Description:** Vercel KV (Upstash Redis) REST API URL  
**Where to Set:** Auto-injected by Vercel when KV database is connected  
**Example:** `https://your-kv-db.upstash.io`  
**Note:** Automatically set when you connect KV database in Vercel Dashboard

---

### `KV_REST_API_TOKEN`
**Required:** ✅ Yes (if using KV storage)  
**Type:** String  
**Description:** Vercel KV (Upstash Redis) REST API authentication token  
**Where to Set:** Auto-injected by Vercel when KV database is connected  
**Example:** `AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`  
**Note:** Automatically set when you connect KV database in Vercel Dashboard

---

### `KV_REST_API_READ_ONLY_TOKEN`
**Required:** ⚠️ Optional  
**Type:** String  
**Description:** Vercel KV read-only token (if using read-only access)  
**Where to Set:** Auto-injected by Vercel  
**Note:** Automatically set when you connect KV database

---

### `KV_URL`
**Required:** ⚠️ Optional  
**Type:** URL String  
**Description:** Vercel KV connection URL (alternative to REST API)  
**Where to Set:** Auto-injected by Vercel  
**Note:** Automatically set when you connect KV database

---

### `REDIS_URL`
**Required:** ⚠️ Optional  
**Type:** URL String  
**Description:** Redis connection URL (legacy/alternative)  
**Where to Set:** Auto-injected by Vercel  
**Note:** Automatically set when you connect KV database

---

### `NODE_ENV`
**Required:** ✅ Yes  
**Type:** String  
**Description:** Node.js environment (development, production, test)  
**Where to Set:** Auto-set by Vercel (production) or Next.js (development)  
**Values:** `development` | `production` | `test`  
**Note:** Automatically set - do not manually override

---

## Optional Environment Variables

### `JWT_SECRET`
**Required:** ⚠️ Optional (but Recommended)  
**Type:** String  
**Description:** Secret key for signing JWT authentication tokens  
**Where to Set:** Vercel Dashboard → Settings → Environment Variables  
**Example:** `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`  
**Default:** Falls back to `ADMIN_PASSWORD` if not set  
**Security:** 
- Use a strong, random secret (32+ characters)
- Different from `ADMIN_PASSWORD`
- Generate with: `openssl rand -hex 32`
- Rotate quarterly

**Usage:**
- JWT token signing for admin authentication
- Session token generation
- Token verification

**Setup:**
1. Generate secret: `openssl rand -hex 32`
2. Add to Vercel environment variables
3. Set for Production, Preview, and Development
4. Redeploy application

---

### `GOOGLE_MAPS_API_KEY`
**Required:** ⚠️ Optional  
**Type:** String  
**Description:** Google Maps API key for address autocomplete functionality  
**Where to Set:** Vercel Dashboard → Settings → Environment Variables  
**Example:** `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`  
**Usage:** 
- Google Places Autocomplete component
- Address validation
- Geocoding

**Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable "Places API" and "Geocoding API"
4. Create API key
5. Restrict API key to your domain (recommended)
6. Add to Vercel environment variables

**Security:**
- Restrict API key to specific domains
- Set usage quotas
- Monitor usage in Google Cloud Console

---

## Environment-Specific Configuration

### Development (Local)
When running locally with `npm run dev`:

**Required:**
- `ADMIN_PASSWORD` (set in `.env.local` - not committed to Git)
- `KV_REST_API_URL` (if testing KV functionality)
- `KV_REST_API_TOKEN` (if testing KV functionality)

**Optional:**
- `GOOGLE_MAPS_API_KEY` (if testing Maps functionality)
- `NODE_ENV` (auto-set to `development`)

**Local Setup:**
```bash
# Create .env.local file (not committed to Git)
cp .env.example .env.local

# Edit .env.local with your values
ADMIN_PASSWORD=your-dev-password
KV_REST_API_URL=https://your-kv.upstash.io
KV_REST_API_TOKEN=your-token
GOOGLE_MAPS_API_KEY=your-key
```

---

### Production (Vercel)
When deployed to Vercel:

**Auto-Set by Vercel:**
- `NODE_ENV=production`
- `KV_REST_API_URL` (when KV connected)
- `KV_REST_API_TOKEN` (when KV connected)
- `KV_REST_API_READ_ONLY_TOKEN` (when KV connected)
- `KV_URL` (when KV connected)
- `REDIS_URL` (when KV connected)

**Must Set Manually:**
- `ADMIN_PASSWORD` (in Vercel Dashboard)
- `GOOGLE_MAPS_API_KEY` (if using Maps)

**Setting in Vercel:**
1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add variable for Production, Preview, and/or Development
5. Click Save
6. Redeploy for changes to take effect

---

## Environment Variable Checklist

### Pre-Deployment
- [ ] `ADMIN_PASSWORD` set in Vercel (strong password)
- [ ] KV database connected (auto-injects KV variables)
- [ ] `GOOGLE_MAPS_API_KEY` set (if using Maps)
- [ ] All variables set for Production environment
- [ ] Variables documented in secure location

### Post-Deployment Verification
- [ ] Admin interface accessible with password
- [ ] KV storage working (can upload pricing file)
- [ ] Google Maps working (if configured)
- [ ] No environment variable errors in logs

---

## Security Best Practices

### 1. Never Commit Secrets
- ✅ `.env.local` is in `.gitignore`
- ✅ Never commit `.env` files
- ✅ Use Vercel environment variables for production

### 2. Use Strong Passwords
- Minimum 16 characters
- Mix of character types
- Unique for each environment
- Stored in password manager

### 3. Rotate Credentials
- Admin password: Quarterly
- API keys: Annually or when compromised
- KV tokens: When Vercel rotates (automatic)

### 4. Restrict API Keys
- Google Maps API key restricted to your domain
- Set usage quotas
- Monitor usage regularly

### 5. Access Control
- Limit who has access to Vercel Dashboard
- Use team permissions appropriately
- Document who has access to secrets

---

## Troubleshooting

### Issue: "KV storage is not configured"
**Solution:**
1. Connect KV database in Vercel Dashboard → Storage
2. Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set
3. Redeploy application

### Issue: "Unauthorized" in admin interface
**Solution:**
1. Verify `ADMIN_PASSWORD` is set in Vercel
2. Check password matches exactly (case-sensitive)
3. Clear browser cache and try again
4. Redeploy if variable was just added

### Issue: Google Maps not working
**Solution:**
1. Verify `GOOGLE_MAPS_API_KEY` is set
2. Check API key is valid in Google Cloud Console
3. Verify Places API and Geocoding API are enabled
4. Check API key restrictions allow your domain

### Issue: Environment variable not taking effect
**Solution:**
1. Verify variable is set for correct environment (Production/Preview/Development)
2. Redeploy application after adding variable
3. Check variable name matches exactly (case-sensitive)
4. Verify no typos in variable name

---

## Quick Reference

**Set in Vercel Dashboard:**
- `ADMIN_PASSWORD` ✅
- `GOOGLE_MAPS_API_KEY` (optional)

**Auto-Set by Vercel:**
- `NODE_ENV` ✅
- `KV_REST_API_URL` ✅
- `KV_REST_API_TOKEN` ✅
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`
- `REDIS_URL`

**Set Locally (`.env.local`):**
- All variables for local development

---

**Last Updated:** January 22, 2026  
**Maintained By:** Development Team  
**Review Frequency:** Quarterly
