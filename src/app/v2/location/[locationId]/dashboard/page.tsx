import { redirect } from 'next/navigation';
import { GHL_APP_VERSION_ID } from '@/lib/ghl/oauth-utils';

/**
 * GHL-style path: /v2/location/{locationId}/dashboard
 * Redirects to the main dashboard with locationId so session + context work.
 * When path has app version_id (not a real location), omit it so session/postMessage provide the real locationId.
 */
export default async function V2LocationDashboardPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  if (!locationId) redirect('/dashboard');
  if (locationId === GHL_APP_VERSION_ID) redirect('/dashboard');
  redirect(`/dashboard?locationId=${encodeURIComponent(locationId)}`);
}
