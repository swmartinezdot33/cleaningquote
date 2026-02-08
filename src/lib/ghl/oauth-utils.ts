/**
 * Shared OAuth utilities — used by authorize, callback, and token-store. See GHL_IFRAME_APP_AUTH.md.
 */

/**
 * Base URL for OAuth redirects (APP_BASE_URL or Vercel/localhost)
 */
export function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
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
