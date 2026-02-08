import { redirect } from 'next/navigation';

const CANONICAL_DASHBOARD = 'https://www.cleanquote.io/dashboard';

/**
 * GHL loads custom menu links at /v2/location/{locationId}/custom-menu-link/{linkId}.
 * Redirect to canonical dashboard so the app runs on www.cleanquote.io.
 */
export default async function V2LocationCustomMenuLinkPage({
  params,
}: {
  params: Promise<{ locationId: string; linkId: string }>;
}) {
  const { locationId } = await params;
  const url = locationId
    ? `${CANONICAL_DASHBOARD}?locationId=${encodeURIComponent(locationId)}`
    : CANONICAL_DASHBOARD;
  redirect(url);
}
