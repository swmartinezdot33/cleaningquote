/**
 * Resolve tool slug from a /t pathname.
 * - /t/[toolSlug] → tool slug (single segment)
 * - /t/[orgSlug]/[toolSlug] → tool slug (second segment)
 * The config API expects the tool slug, not the org slug.
 */
export function getToolSlugFromPath(pathname: string | null): string | null {
  const match = pathname?.match(/^\/t\/([^/]+)(?:\/([^/]+))?/);
  if (!match) return null;
  const first = match[1];
  const second = match[2];
  return second ?? first; // /t/org/tool → tool; /t/tool → tool
}
