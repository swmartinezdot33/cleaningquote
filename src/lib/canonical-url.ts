/**
 * Single source of truth for the main canonical domain.
 * Use everywhere we need the public site URL (metadata, sitemap, redirects, emails).
 */

export const CANONICAL_SITE_URL = "https://www.cleanquote.io"

/**
 * Returns the app base URL (no trailing slash).
 * Prefer NEXT_PUBLIC_APP_URL when set (e.g. for staging); otherwise canonical domain.
 * In production, set NEXT_PUBLIC_APP_URL=https://www.cleanquote.io so redirects and links use the canonical domain.
 */
export function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (env && env.startsWith("http")) return env.replace(/\/$/, "")
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel && !vercel.startsWith("http")) return `https://${vercel}`
  return CANONICAL_SITE_URL
}
