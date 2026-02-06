# Next Steps Before Full Production & Onboarding Users

**Last updated:** February 2026

Use this checklist before going live and onboarding paying users. Order matters: do env and infra first, then verification, then docs.

---

## 1. Production environment (Vercel)

- [ ] **Custom domain** added in Vercel → Settings → Domains (e.g. `www.cleanquote.io`).
- [ ] **`NEXT_PUBLIC_APP_URL`** set in Vercel → Environment Variables (Production) to that domain (no trailing slash), e.g. `https://www.cleanquote.io`.  
  Needed for auth redirects, invite links, and canonical URLs.
- [ ] **Vercel KV** created and linked so `KV_REST_API_*` / `REDIS_URL` are injected (required for auth sessions and rate limiting).
- [ ] **Redeploy** after changing env vars so production uses them.

---

## 2. Security (production-only)

- [ ] **`ADMIN_PASSWORD`** set in Vercel (strong, 16+ chars); never commit.
- [ ] **`JWT_SECRET`** set in Vercel (recommended; separate from `ADMIN_PASSWORD`).  
  Generate: `openssl rand -hex 32`.
- [ ] **`RESEND_WEBHOOK_SECRET`** set in Vercel if you use Resend inbound webhooks (required in prod; otherwise webhook returns 503).

---

## 3. Supabase (multi-tenant auth & dashboard)

- [ ] **Supabase project** created; `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` set in Vercel.
- [ ] **Redirect URLs** in Supabase Dashboard → Authentication → URL Configuration:
  - Add `https://www.cleanquote.io/**` (or your production domain).
  - Add `https://www.cleanquote.io/invite/**` for org invites.
- [ ] **Migrations** run (e.g. `tools`, `organizations`, `organization_members`); see `SUPABASE_SETUP.md` / `SUPABASE_MULTITENANT_SETUP.md`.
- [ ] **`SUPER_ADMIN_EMAILS`** set in Vercel (comma-separated) for super-admin access to `/dashboard/super-admin`.

---

## 4. Stripe (subscriptions & checkout)

- [ ] **`STRIPE_SECRET_KEY`** and **`STRIPE_WEBHOOK_SECRET`** set in Vercel (Production).
- [ ] **Stripe webhook** in Stripe Dashboard → Developers → Webhooks:
  - URL: `https://www.cleanquote.io/api/webhooks/stripe` (your production URL).
  - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
  - Copy signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] **`NEXT_PUBLIC_STRIPE_BILLING_PORTAL_URL`** set so “Manage billing” on the dashboard works.
- [ ] **`NEXT_PUBLIC_STRIPE_CHECKOUT_URL`** set if you want marketing CTAs to open Stripe Checkout directly.
- [ ] **Post-checkout email:** `RESEND_API_KEY` and `RESEND_FROM` set if you use Resend for set-password emails.

---

## 5. Optional but recommended

- [ ] **`GOOGLE_MAPS_API_KEY`** (or per-tool key in dashboard) if using address autocomplete / maps.
- [ ] **CORS** in `next.config.js` if the quote widget is embedded on other domains.
- [ ] **Error monitoring** (e.g. Sentry) and alerts for 5xx and critical failures.
- [ ] **Vercel Analytics** (optional) for traffic and performance.

---

## 6. Post-deploy verification

- [ ] **Build:** `npm run build` passes (already verified).
- [ ] **Homepage** loads at production URL.
- [ ] **Login:** `/login` → sign in with a test user → redirect to dashboard.
- [ ] **Dashboard:** `/dashboard` shows org/tools; no unexpected errors.
- [ ] **Admin:** `/admin` — log in with JWT (or legacy password); upload pricing / change settings.
- [ ] **Quote flow:** Submit a quote from `/t/{orgSlug}/{toolSlug}` or embed; quote calculates and (if configured) creates GHL contact/opportunity.
- [ ] **Stripe:** Test checkout (test mode) → webhook runs → user/org created and (if configured) set-password email sent.
- [ ] **Invite:** From dashboard Settings page, invite a second user; they receive email and can accept via `NEXT_PUBLIC_APP_URL` invite link.

---

## 7. Before onboarding real users

- [ ] **Pricing file** uploaded (admin or dashboard per-tool) so quotes are correct.
- [ ] **GHL** (if used): token, location, pipelines, custom fields configured per tool or globally as intended.
- [ ] **Service area** (if used): KML or network link configured so “in/out of area” is correct.
- [ ] **Billing:** Stripe live keys and live webhook in place; billing portal URL correct.
- [ ] **Docs for customers:** “how to sign up, set password, create first tool, embed widget” Use **`docs/GETTING_STARTED_GUIDE.md`** (sign up → set password → first tool → embed). Copy to help site or Notion if needed.
- [ ] **Support path:** In that guide, fill in the **Support** section with how users contact you (e.g. support@cleanquote.io, help center URL, or in-app link).

---

## 8. Quick reference

| Area        | Key docs / files                          |
|------------|--------------------------------------------|
| Env vars   | `ENVIRONMENT_VARIABLES.md`                 |
| Deploy     | `QUICK_DEPLOY.md`, `PRODUCTION_READINESS.md` |
| Security   | `SECURITY_SUMMARY.md`, `SECURITY_DEBUG_RESULTS.md` |
| Supabase   | `SUPABASE_SETUP.md`, `SUPABASE_MULTITENANT_SETUP.md` |
| Stripe     | `STRIPE_WEBHOOK_TROUBLESHOOTING.md`       |
| Migration  | `MIGRATION_OPTION_B.md`, `SUPABASE_TRANSITION_REMAINING.md` |
| User guide | `docs/GETTING_STARTED_GUIDE.md`                             |

---

**Summary:** Set production URL and env (Vercel + Supabase + Stripe), lock down security (JWT, webhooks), verify auth and quote and billing flows, then document signup and support for users.
