import { redirect } from 'next/navigation';
import { GHL_APP_VERSION_ID } from '@/lib/ghl/oauth-utils';

/** Custom page link ID used by GHL menu; redirect base/dashboard URLs here so one menu item works. */
const CUSTOM_PAGE_LINK_ID = '6983df14aa911f4d3067493d';

/**
 * GHL loads iframe at /v2/location/{locationId} or /v2/location/{locationId}/.
 * Redirect to the custom-page-link URL (same as the CleanQuote menu item) so the app loads in the iframe.
 */
export default async function V2LocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locationId } = await params;
  if (!locationId) redirect('/dashboard');
  if (locationId === GHL_APP_VERSION_ID) redirect('/dashboard');

  const sp = await searchParams;
  const qs = new URLSearchParams();
  Object.entries(sp).forEach(([k, v]) => {
    if (v !== undefined && v !== '') qs.set(k, Array.isArray(v) ? v[0] : v);
  });
  const q = qs.toString();
  redirect(`/v2/location/${locationId}/custom-page-link/${CUSTOM_PAGE_LINK_ID}${q ? `?${q}` : ''}`);
}
