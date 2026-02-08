# GHL Marketplace OAuth Setup

The OAuth flow matches **MaidCentral** and uses the same pattern.

**Note:** If `GHL_REDIRECT_URI` was previously set to `connect/callback`, the code now normalizes it to `oauth/callback` so both will work. GHL Marketplace must have `oauth/callback` registered.

## Required: GHL Marketplace App Config

1. Go to GHL Marketplace → Your App → Settings
2. Set **Redirect URI** to exactly:
   ```
   https://www.cleanquote.io/api/auth/oauth/callback
   ```
   (Use your production domain; must match `GHL_REDIRECT_URI` in env.)

3. Get your **Client ID**, **Client Secret**, and **Shared Secret** (SSO key).

## Environment Variables

```bash
GHL_CLIENT_ID=your_client_id
GHL_CLIENT_SECRET=your_client_secret
GHL_REDIRECT_URI=https://www.cleanquote.io/api/auth/oauth/callback
GHL_APP_SSO_KEY=your_shared_secret
APP_BASE_URL=https://www.cleanquote.io
```

## Flow

1. **Launch URL** (`/app`): If no session/token → redirects to OAuth.
2. **Setup page** (`/dashboard/setup`): "Install via OAuth" opens a **new tab** (like MaidCentral).
3. OAuth completes → callback stores token, sets session cookie, redirects to `/oauth-success` or `/dashboard`.
4. Returning users with token or session go straight to dashboard.

## Live URL (Recommended)

Set **Live URL** in GHL to:
```
https://www.cleanquote.io/dashboard
```
Returning users will load the dashboard directly without re-OAuth.
