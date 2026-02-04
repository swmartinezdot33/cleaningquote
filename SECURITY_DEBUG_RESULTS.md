# Security Debug Results

**Date:** February 4, 2026  
**Run:** Local dev (port 3001), instrumentation in place

## Log evidence (`.cursor/debug.log`)

| Line | Hypothesis | Evidence | Verdict |
|------|------------|----------|---------|
| 1 | H-A | `method: "denied"` — admin pricing with no auth | **CONFIRMED** — 401 returned |
| 2–3 | H-C, H-A | `verify_failed` then `method: "denied"` — invalid Bearer token | **CONFIRMED** — JWT verification rejects invalid token |
| 4 | H-B | `outcome: "invalid_password"` | **CONFIRMED** — failed login recorded |
| 5 | H-B | `outcome: "success"` | **CONFIRMED** — successful login |
| 6–7 | H-C, H-A | `result: "valid"`, `method: "jwt"` | **CONFIRMED** — JWT accepted after login |
| 8 | H-A | `method: "legacy"` | **CONFIRMED** — x-admin-password still works (migration path) |
| 9 | H-E | `Dashboard access denied`, `pathname: "/api/dashboard/orgs"` | **CONFIRMED** — unauthenticated dashboard API returns 401 |

## Summary

- **Admin auth (requireAdminAuth):** Unauthenticated and invalid JWT → denied. Valid JWT or legacy password → allowed.
- **Login:** Wrong password → `invalid_password`; correct password → `success`. Rate limiting not exercised in this run (would trigger after 5 failed attempts).
- **JWT verification:** Invalid token → `invalid`; valid token after login → `valid`.
- **Dashboard:** Unauthenticated request to `/api/dashboard/orgs` → middleware returns 401.
- **Webhooks:** Stripe/Resend paths were not called in this run; Stripe already verifies signature; Resend now requires `RESEND_WEBHOOK_SECRET` in production (see below).

## Hardening applied

- **Resend webhook:** When `RESEND_WEBHOOK_SECRET` is not set, the handler now returns **503** in production instead of accepting any JSON. In development it still accepts JSON when the secret is unset (for local testing).

## Recommendations (no code change this run)

1. **JWT_SECRET:** Ensure `JWT_SECRET` is set in production (distinct from `ADMIN_PASSWORD`). If both are missing, auth falls back to a hardcoded string in `auth.ts`.
2. **Admin routes:** Many `/api/admin/*` routes still use only `x-admin-password` (e.g. ghl-config, widget-settings, migration routes). They remain protected but don’t use `requireAdminAuth` (no JWT, no rate limit on that route). Consider migrating them to `requireAdminAuth()` for consistency.
3. **Instrumentation:** Debug logs remain in `auth.ts`, middleware, and webhook routes for post-fix verification. Remove once you’re satisfied (or keep behind a feature flag).
