# Vercel Environments Setup

Verify your CleanQuote project has **Development**, **Preview**, and **Production** environments configured correctly.

## Overview

| Environment | Purpose | Branch | URL |
|-------------|---------|--------|-----|
| **Development** | Local coding | — | `http://localhost:3000` (run `npm run dev`) |
| **Preview** | Pre-production testing | `development` (and other non-main) | `cleaningquote-git-development-*.vercel.app` |
| **Production** | Live site | `main` | `www.cleanquote.io` |

---

## 1. Verify in Vercel Dashboard

Go to **[vercel.com/dashboard](https://vercel.com/dashboard)** → select your **cleaningquote** project.

### Production branch
1. **Settings** → **Git** (or **Environments**)
2. Confirm **Production Branch** = `main`
3. Pushes to `main` → Production deployment → www.cleanquote.io

### Preview deployments
1. Any push to `development` (or other non-main branches) automatically creates a **Preview** deployment
2. Each deployment gets a URL like:  
   `https://cleaningquote-git-development-{team}.vercel.app`

### Local development
1. Run locally: `npm run dev`
2. Optionally pull env vars: `vercel env pull` (after `vercel link`)

---

## 2. Environment variables by environment

**Settings** → **Environment Variables**

Set variables for each environment:

| Variable | Production | Preview | Development (local) |
|----------|------------|---------|---------------------|
| `NEXT_PUBLIC_APP_URL` | `https://www.cleanquote.io` | Preview URL | `http://localhost:3000` |
| Supabase, Stripe, KV, etc. | ✅ | ✅ (or separate preview DB) | `.env.local` |

- Use **Production** for prod-only vars
- Use **Preview** for preview/testing vars
- **Development** = `.env.local` via `vercel env pull --environment=development`

---

## 3. Optional: dedicated dev domain (Pro plan)

If you want a stable URL for the `development` branch (e.g. `dev.cleanquote.io`):

1. **Settings** → **Domains** → **Add**
2. Add `dev.cleanquote.io` (or `development.cleanquote.io`)
3. Assign it to the **development** branch
4. Add DNS: CNAME `dev` → `cname.vercel-dns.com`

---

## 4. Quick check

| Check | Expected |
|-------|----------|
| Production branch | `main` |
| Pushing to `main` | Deploys to www.cleanquote.io |
| Pushing to `development` | Creates preview deployment with unique URL |
| Local dev | `npm run dev` runs at localhost:3000 |

---

## 5. CLI commands (after `vercel link`)

```bash
# Deploy to Preview (development branch)
vercel

# Deploy to Production (main)
vercel --prod

# Pull env vars for local dev
vercel env pull
```
