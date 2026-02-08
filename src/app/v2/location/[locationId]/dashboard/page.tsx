import { redirect } from 'next/navigation';

/**
 * GHL-style path: /v2/location/{locationId}/dashboard
 * Redirects to the main dashboard with locationId so session + context work.
 */
export default async function V2LocationDashboardPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  if (!locationId) redirect('/dashboard');
  redirect(`/dashboard?locationId=${encodeURIComponent(locationId)}`);
}
