import { redirect } from 'next/navigation';

const APP_BASE = 'https://www.cleanquote.io';

/** Paths we allow for deep links from GHL custom pages (e.g. "Contacts" → our contacts page). */
const ALLOWED_PATHS: Record<string, string> = {
  contacts: '/dashboard/crm/contacts',
  dashboard: '/dashboard',
  quotes: '/dashboard/quotes',
  leads: '/dashboard/crm',
  tools: '/dashboard/tools',
  'service-areas': '/dashboard/service-areas',
  pricing: '/dashboard/pricing-structures',
};

/**
 * GHL loads custom page links at /v2/location/{locationId}/custom-page-link/{linkId}.
 * Redirect to app with locationId. Use ?page=contacts (or ?path=/dashboard/crm/contacts) to open a specific page.
 * In GHL: create a custom page link for "Contacts" with URL ending in ?page=contacts to open our contacts page.
 */
export default async function V2LocationCustomPageLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string; linkId: string }>;
  searchParams: Promise<{ page?: string; path?: string }>;
}) {
  const { locationId } = await params;
  const sp = await searchParams;
  const pathParam = sp.path?.trim();
  const pageParam = sp.page?.trim()?.toLowerCase();
  let path = '/dashboard';
  if (pathParam?.startsWith('/dashboard')) {
    path = pathParam;
  } else if (pageParam && ALLOWED_PATHS[pageParam]) {
    path = ALLOWED_PATHS[pageParam];
  }
  const url = locationId
    ? `${APP_BASE}${path}?locationId=${encodeURIComponent(locationId)}`
    : `${APP_BASE}${path}`;
  redirect(url);
}
