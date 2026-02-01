# Custom Domain 404 Troubleshooting

If your custom domain (e.g. `main2.cleanquote.io`) shows DNS verified in Vercel but you get **404 This page could not be found** when visiting the quote link, follow these steps.

## 1. Check if the path works on the main domain

Try the **same path** on the main app domain:

- If your app is at `cleanquote.io` or `www.cleanquote.io`:  
  `https://cleanquote.io/t/raleighcleaningcompany/rcc`
- Or on Vercel:  
  `https://cleaningquote.vercel.app/t/raleighcleaningcompany/rcc`

**If it works on the main domain but not on your custom domain** → The custom domain is likely on the wrong Vercel project or not pointing at this app.

**If it 404s on both** → The org or tool may not exist in the database (see Step 3).

---

## 2. Verify the custom domain is on the correct Vercel project

The custom domain must be on the **same Vercel project** that serves the CleanQuote app.

1. Open [Vercel Dashboard](https://vercel.com) → your team
2. Open the **cleaningquote** (or equivalent) project that runs the app
3. Go to **Settings** → **Domains**
4. Confirm `main2.cleanquote.io` is listed

If `main2.cleanquote.io` is not there, or if it appears under a different project:

- Remove it from the wrong project (if present)
- Add it to the **cleaningquote** project
- Confirm DNS (CNAME/A) still points to Vercel as before

When added via the Public link base URL in CleanQuote, the domain is added to the project configured by `VERCEL_PROJECT_ID` / `VERCEL_PROJECT_NAME`. Ensure those env vars match the actual project.

---

## 3. Verify org and tool exist in the database

The path `/t/raleighcleaningcompany/rcc` expects:

- An org with slug `raleighcleaningcompany`
- A tool with slug `rcc` in that org

If either is missing, the app returns 404 via `notFound()`.

Check in Supabase (or your DB):

- `organizations` table: row with `slug = 'raleighcleaningcompany'`
- `tools` table: row with `slug = 'rcc'` and `org_id` matching that org

Ensure the slugs in the URL match exactly (including case).

---

## 4. Confirm Production deployment

In the Vercel project:

1. Go to **Deployments**
2. Confirm the latest deployment is **Production**
3. Confirm `main2.cleanquote.io` is assigned to Production (Settings → Domains)

---

## Quick checklist

| Check | Action |
|-------|--------|
| Same path on main domain works | Yes → focus on domain assignment |
| Custom domain on correct project | Vercel → Project → Settings → Domains |
| Org `raleighcleaningcompany` exists | Supabase → organizations |
| Tool `rcc` exists in that org | Supabase → tools |
| DNS verified in Vercel | Domain shows verified |
| Production deployment | Latest prod deployment is active |

---

## Common cause: domain on wrong project

A frequent cause of 404 with verified DNS is the domain being attached to a different Vercel project (for example, a separate “main2” or preview project). Move the domain to the project that actually serves the CleanQuote app.
