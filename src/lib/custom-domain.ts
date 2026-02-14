import { createSupabaseServer } from '@/lib/supabase/server';

/** Hosts that belong to our app (marketing, dashboard, main domain). */
const OWN_DOMAIN_PATTERNS = [
  'cleanquote.io',
  'www.cleanquote.io',
  'localhost',
  'localhost:3000',
  '127.0.0.1',
];

/**
 * Returns true if the request host is our own app domain (cleanquote.io, localhost, Vercel preview).
 * Used to avoid showing the neutral "invalid link" page on our own site.
 */
export function isOwnAppDomain(host: string): boolean {
  if (!host) return false;
  const h = host.toLowerCase().replace(/:\d+$/, '');
  if (OWN_DOMAIN_PATTERNS.some((d) => h === d)) return true;
  if (h.endsWith('.cleanquote.io')) return true;
  if (h.endsWith('.vercel.app')) return true;
  return false;
}

/**
 * Returns true if the given host is configured as a client custom domain
 * (appears in any tool's publicBaseUrls in tool_config.form_settings).
 * Used to show a neutral unbranded page at / on custom domains so visitors
 * don't discover CleanQuote when they land on the root URL without a slug.
 */
export async function isHostCustomDomain(host: string): Promise<boolean> {
  const orgId = await getOrgIdForCustomDomainHost(host);
  return orgId != null;
}

/**
 * Returns the org id for the tool that has this host in its publicBaseUrls (custom domain).
 * Used to look up GHL location and redirect root visits to the location's website.
 */
export async function getOrgIdForCustomDomainHost(host: string): Promise<string | null> {
  if (!host) return null;
  const supabase = createSupabaseServer();
  const { data: configRows } = await supabase
    .from('tool_config')
    .select('tool_id, form_settings')
    .not('form_settings', 'is', null);

  const hostLower = host.toLowerCase().split(':')[0];
  let matchedToolId: string | null = null;
  for (const row of configRows ?? []) {
    const formSettings = (row as { form_settings?: { publicBaseUrls?: string[] } }).form_settings;
    const urls = Array.isArray(formSettings?.publicBaseUrls) ? formSettings.publicBaseUrls : [];
    for (const urlStr of urls) {
      try {
        const u = new URL(urlStr);
        if (u.hostname.toLowerCase() === hostLower) {
          matchedToolId = (row as { tool_id: string }).tool_id;
          break;
        }
      } catch {
        // ignore invalid URLs
      }
    }
    if (matchedToolId) break;
  }
  if (!matchedToolId) return null;

  const { data: tool } = await supabase
    .from('tools')
    .select('org_id')
    .eq('id', matchedToolId)
    .maybeSingle();

  const orgId = (tool as { org_id?: string } | null)?.org_id;
  return typeof orgId === 'string' ? orgId : null;
}
