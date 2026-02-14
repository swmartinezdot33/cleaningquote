import { redirect } from 'next/navigation';
import { GHL_APP_VERSION_ID } from '@/lib/ghl/oauth-utils';

/** When parent sets iframe src with ?page=contacts (etc.), redirect to that dashboard page. */
const ALLOWED_PAGES: Record<string, string> = {
  contacts: '/dashboard/crm/contacts',
  dashboard: '/dashboard',
  inbox: '/dashboard/crm/inbox',
  quotes: '/dashboard/quotes',
  leads: '/dashboard/crm',
  tools: '/dashboard/tools',
  'service-areas': '/dashboard/service-areas',
  pricing: '/dashboard/pricing-structures',
  settings: '/dashboard/settings',
};

/**
 * GHL loads iframe at /v2/location/{locationId} (no trailing path). Redirect to dashboard;
 * if URL has ?page=contacts (or ?path=...), redirect to that page so parent can open Contacts directly.
 */
export default async function V2LocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<{ page?: string; path?: string }>;
}) {
  const { locationId } = await params;
  if (!locationId) redirect('/dashboard');
  if (locationId === GHL_APP_VERSION_ID) redirect('/dashboard');

  const sp = await searchParams;
  const pathParam = sp.path?.trim();
  const pageParam = sp.page?.trim()?.toLowerCase();
  let path = '/dashboard';
  if (pathParam?.startsWith('/dashboard')) {
    path = pathParam;
  } else if (pageParam && ALLOWED_PAGES[pageParam]) {
    path = ALLOWED_PAGES[pageParam];
  }

  const q = `locationId=${encodeURIComponent(locationId)}`;
  redirect(`${path}${path.includes('?') ? '&' : '?'}${q}`);
}
