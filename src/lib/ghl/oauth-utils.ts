/**
 * Shared OAuth utilities — used by authorize, callback, and token-store. See GHL_IFRAME_APP_AUTH.md.
 */

/** GHL Marketplace app install page — use for "Connect" / "Install" links so users install from the official app page. Export for client components. */
export const GHL_MARKETPLACE_APP_URL_DEFAULT =
  'https://app.gohighlevel.com/integration/6983957514ceb0bb033c8aa1/versions/6983957514ceb0bb033c8aa1';

/**
 * URL to the CleanQuote app in the GHL Marketplace (install/connect link).
 * Override with GHL_MARKETPLACE_APP_URL env if needed.
 */
export function getGHLMarketplaceAppUrl(): string {
  return process.env.GHL_MARKETPLACE_APP_URL?.trim() || process.env.NEXT_PUBLIC_GHL_MARKETPLACE_APP_URL?.trim() || GHL_MARKETPLACE_APP_URL_DEFAULT;
}

/**
 * Base URL for OAuth redirects (APP_BASE_URL or Vercel/localhost)
 */
export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

/** Canonical app URL for post-OAuth redirect (e.g. new window lands here). Use CANONICAL_APP_URL or POST_OAUTH_REDIRECT_BASE env to override. */
const CANONICAL_APP_URL_DEFAULT = 'https://my.cleanquote.io';

export function getPostOAuthRedirectBase(): string {
  const env = process.env.CANONICAL_APP_URL?.trim() || process.env.POST_OAUTH_REDIRECT_BASE?.trim();
  if (env) return env.replace(/\/$/, '');
  return CANONICAL_APP_URL_DEFAULT;
}

/**
 * Redirect URI for OAuth — must match GHL Marketplace config.
 * Normalizes connect/callback → oauth/callback so both work.
 * Use this in authorize, callback, AND token refresh.
 */
export function getRedirectUri(baseUrl?: string): string {
  const base = baseUrl ?? getAppBaseUrl();
  const env = process.env.GHL_REDIRECT_URI?.trim();
  if (env && env.includes('/api/auth/')) {
    const normalized = env.replace(/\/api\/auth\/connect\/callback\/?$/i, '/api/auth/oauth/callback');
    return normalized.startsWith('http') ? normalized : `${base}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  }
  return env || `${base}/api/auth/oauth/callback`;
}
