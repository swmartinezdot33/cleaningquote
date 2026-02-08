import { redirect } from 'next/navigation';

const CANONICAL_DASHBOARD = 'https://www.cleanquote.io/dashboard';

/**
 * GHL loads custom page links at /v2/location/{locationId}/custom-page-link/{linkId}.
 * Redirect to canonical dashboard so the app runs on www.cleanquote.io (same as custom-menu-link).
 */
export default async function V2LocationCustomPageLinkPage({
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
