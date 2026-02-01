# Live sites: config / color not updating

If widget settings (title, subtitle, primary color) work locally but **not on the live site** (e.g. `quote.raleighcleaningcompany.com/t/quote`), use this to narrow it down.

## 1. Check what the API is actually returning

Open this URL in a **new tab** (same domain as the live tool):

- **Custom domain:**  
  `https://quote.raleighcleaningcompany.com/api/tools/quote/config`
- **CleanQuote host:**  
  `https://www.cleanquote.io/api/tools/quote/config`

In the JSON response, check:

- `widget.primaryColor` – should be the hex you set (e.g. `#00ff7b`).
- `_meta.toolId` – should match the tool you edited (e.g. `eae9b339-203b-4c3f-8429-092e0be4783a` for RCC Quoting Tool).
- `_meta.configUpdatedAt` – should be recent after you saved.

- **If the API shows the correct color**  
  The backend is fine. The live page is likely using cached HTML/JS or an old bundle. Do step 2.

- **If the API shows the wrong or default color**  
  Either the DB wasn’t updated (save failed or wrong env), or the response is cached. Do steps 2 and 3.

## 2. Force fresh deploy and no cache

1. **Redeploy**  
   Vercel → your project → Deployments → … on latest → **Redeploy** (no new commit needed).
2. **Purge cache (optional)**  
   Vercel → Settings → General → **Purge Cache** (or purge for the config path if you have that option).
3. **Test in a clean context**  
   Open the **live tool URL** in an **Incognito/Private** window, or do a **hard refresh** (Cmd+Shift+R / Ctrl+Shift+R).

## 3. Confirm save on production

Settings are stored in **production** Supabase. Saving on **cleanquote.io** updates production; saving only in **local** dev does not.

1. On **production** (cleanquote.io), go to **Dashboard → RCC Quoting Tool → Settings**.
2. Set **Primary Brand Color** (e.g. `#00ff7b`) and click **Save Widget Settings**.
3. Check for a success message.
4. Wait a few seconds, then open the config URL from step 1 again and confirm `widget.primaryColor` and `_meta.configUpdatedAt` updated.

## 4. Custom domain and deployment

Ensure the custom domain points at the **same** Vercel project and the **latest** production deployment:

- Vercel → your project → **Settings → Domains**  
  `quote.raleighcleaningcompany.com` should be listed and assigned to **Production**.
- **Deployments**  
  The deployment marked as Production should be the one you just redeployed.

If the domain or production deployment is wrong, the live site can run old code and show old config.

## Summary

| Symptom | Likely cause | Action |
|--------|---------------|--------|
| API returns correct color, page shows wrong color | Cached page/JS | Redeploy, hard refresh, incognito |
| API returns wrong/default color | Cached API or DB not updated | Redeploy, purge cache, save again on production, re-check API |
| API 404/500 | Wrong slug or deployment | Confirm slug in URL and that production is deployed |
