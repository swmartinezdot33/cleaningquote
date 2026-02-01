# Custom Domain API

Add and verify customer custom domains on Vercel programmatically via the Vercel REST API. This lets CleanQuote staff add domains without logging into the Vercel dashboard.

## Prerequisites

1. **VERCEL_TOKEN** — Create at [vercel.com/account/tokens](https://vercel.com/account/tokens). Use a token with access to your project.
2. **VERCEL_PROJECT_ID** or **VERCEL_PROJECT_NAME** — Vercel sets `VERCEL_PROJECT_ID` automatically in deployments. Set `VERCEL_PROJECT_NAME` (e.g. `cleaningquote`) if needed.
3. **VERCEL_TEAM_ID** (optional) — For team projects.

Set these in Vercel → Settings → Environment Variables.

## Endpoints

### Add a custom domain

**POST** `/api/admin/custom-domain/add`

Adds a domain to the Vercel project. Returns DNS instructions for the customer.

**Authentication:** `x-admin-password: YOUR_ADMIN_PASSWORD` or `Authorization: Bearer YOUR_JWT`

**Body:**
```json
{
  "domain": "quote.customercompany.com"
}
```

**Example (curl):**
```bash
curl -X POST https://your-site.com/api/admin/custom-domain/add \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD" \
  -d '{"domain": "quote.customercompany.com"}'
```

**Success (200):**
```json
{
  "success": true,
  "domain": "quote.customercompany.com",
  "apexName": "customercompany.com",
  "verified": false,
  "message": "Domain added. Customer must add DNS records to verify.",
  "dnsInstructions": {
    "cname": { "type": "CNAME", "host": "quote", "value": "cname.vercel-dns.com", "ttl": "60" },
    "a": { "type": "A", "host": "quote", "value": "76.76.21.21", "ttl": "60" }
  },
  "verification": []
}
```

Add DNS records with: **Type**, **Host**, **Value**, **TTL** (use lowest available, e.g. 60).

**If domain needs TXT verification:** `verification` includes `type`, `domain`, `value`, `reason` — customer adds that TXT record.

---

### Verify a custom domain

**POST** `/api/admin/custom-domain/verify`

Verifies a domain after the customer has added DNS records.

**Authentication:** Same as add endpoint.

**Body:**
```json
{
  "domain": "quote.customercompany.com"
}
```

**Example (curl):**
```bash
curl -X POST https://your-site.com/api/admin/custom-domain/verify \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD" \
  -d '{"domain": "quote.customercompany.com"}'
```

**Success (200):**
```json
{
  "success": true,
  "domain": "quote.customercompany.com",
  "verified": true,
  "message": "Domain verified. SSL will be provisioned automatically."
}
```

---

## Workflow

1. **Customer requests** custom domain (e.g. quote.customercompany.com).
2. **CleanQuote staff** calls `POST /api/admin/custom-domain/add` with the domain.
3. **Response** includes `dnsInstructions` (CNAME and A records).
4. **Provide customer** with DNS instructions:
   - CNAME: `quote` → `cname.vercel-dns.com` (or subdomain as returned)
   - Or A: `quote` → `76.76.21.21`
5. **Customer adds** DNS records at their registrar (GoDaddy, Namecheap, Cloudflare, etc.).
6. **After propagation** (5–60 min), optionally call `POST /api/admin/custom-domain/verify` to check verification.
7. **Customer** sets Public link base URL in CleanQuote Overview to `https://quote.customercompany.com`.

---

## Errors

- **500** — `VERCEL_TOKEN` or `VERCEL_PROJECT_ID` not configured.
- **400** — Invalid domain, domain already on project, or domain on another Vercel project.
- **401** — Invalid admin auth.
