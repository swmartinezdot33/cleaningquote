# OAuth flow debugging

## 1. Check config and session from the browser

Open (same origin as your app, so the cookie is sent if present):

- **Production:** `https://cleanquote.io/api/debug/oauth`
- **Local:** `http://localhost:3000/api/debug/oauth`

You’ll get JSON with:

- `request.hasGhlSessionCookie` — whether the `ghl_session` cookie was sent
- `request.sessionValid` — whether that cookie is valid
- `config` — env vars and computed redirect URI (no secrets)

If you **just finished OAuth** and open this URL in the **same tab** that went through the callback, you should see `sessionValid: true`. If you open it in another tab or in an iframe, you may see `false` (cookie not sent in that context).

## 2. Check Vercel server logs

1. **Vercel Dashboard** → your project → **Logs** (or **Deployments** → pick a deployment → **Functions**).
2. Reproduce the flow:
   - Go to `/dashboard/setup` (or wherever you start install).
   - Click “Install via OAuth” and complete the GHL flow.
   - After redirect, try opening `/dashboard` or `/open-from-ghl`.
3. In the logs, search for these prefixes (one log line per step):

| Search for            | When it runs |
|-----------------------|--------------|
| `[OAuth Authorize]`   | When you hit “Install” and we redirect to GHL. Check `request host`, `Redirect URI`, `Base URL`. |
| `[OAuth Callback]`    | When GHL redirects back to your callback. Check `CALLBACK HIT`, `hasCode`, `hasState`, then either error or `OAuth INSTALLATION SUCCESSFUL`, `REDIRECT TARGET`, `COOKIE SET`. |
| `[OAuth Middleware]`  | When you request any `/dashboard/*`. Either `SESSION OK` (cookie valid) or `NO SESSION` (redirect to open-from-ghl or authorize). |

## 3. What to look for

- **Callback never runs**  
  No `[OAuth Callback]` in logs after you approve in GHL → redirect URI mismatch. Compare `Redirect URI` in `[OAuth Authorize]` with the callback URL configured in the GHL Marketplace app (must match exactly).

- **Callback runs but “NO LOCATION ID”**  
  Log shows `❌ NO LOCATION ID`. Fix: start install from `/dashboard/setup` with the app opened from a GHL **location** (not agency) so we get `locationId` in state or from the token.

- **Callback runs, “COOKIE SET”, but you still see open-from-ghl**  
  Cookie is set in the tab that completed the callback. If you then open `/dashboard` in a **different tab** or **iframe**, the browser may not send the cookie (e.g. third‑party or different context).  
  Fix: after OAuth, use “Go to Dashboard” in the **same tab** that shows oauth-success, or open `/api/debug/oauth` in that same tab and confirm `sessionValid: true`.

- **Middleware always “NO SESSION”**  
  Either the cookie isn’t being set (check callback logs for `COOKIE SET` and `domain=`) or it isn’t sent on the next request (different tab/iframe). Use `/api/debug/oauth` in the same tab that did the callback to confirm.

## 4. Env vars that must match GHL

- `GHL_REDIRECT_URI` or the computed value must **exactly** match the “Callback URL” in the GHL Marketplace app (e.g. `https://cleanquote.io/api/auth/oauth/callback`).
- `APP_BASE_URL` (or Vercel URL) is used as the base for the redirect to `/oauth-success`; it should be your app’s public URL (e.g. `https://cleanquote.io`).
