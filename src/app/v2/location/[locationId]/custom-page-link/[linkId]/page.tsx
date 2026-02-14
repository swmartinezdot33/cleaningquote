import { redirect } from 'next/navigation';

/** Paths we allow for deep links from GHL custom pages (sidebar menu → our app page). */
const ALLOWED_PATHS: Record<string, string> = {
  dashboard: '/dashboard',
  inbox: '/dashboard/crm/inbox',
  contacts: '/dashboard/crm/contacts',
  leads: '/dashboard/crm',
  quotes: '/dashboard/quotes',
  tools: '/dashboard/tools',
  'service-areas': '/dashboard/service-areas',
  pricing: '/dashboard/pricing-structures',
  settings: '/dashboard/settings',
};

/**
 * GHL loads custom page links at /v2/location/{locationId}/custom-page-link/{linkId}.
 * Redirect to the app page on the same origin. Parent can pass ?cleanquote-page=inbox (or ?page=inbox)
 * so clicking "Inbox" in the sidebar opens the inbox; same for contacts, quotes, etc.
 */
export default async function V2LocationCustomPageLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string; linkId: string }>;
  searchParams: Promise<{ page?: string; path?: string; 'cleanquote-page'?: string }>;
}) {
  const { locationId } = await params;
  const sp = await searchParams;
  const pathParam = sp.path?.trim();
  const pageParam = (sp['cleanquote-page'] ?? sp.page)?.trim()?.toLowerCase();
  let path = '/dashboard';
  if (pathParam?.startsWith('/dashboard')) {
    path = pathParam;
  } else if (pageParam && ALLOWED_PATHS[pageParam]) {
    path = ALLOWED_PATHS[pageParam];
  }
  const q = locationId ? `?locationId=${encodeURIComponent(locationId)}` : '';
  redirect(path + q);
}
