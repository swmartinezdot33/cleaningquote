import DashboardClient from './DashboardClient';

/**
 * GHL dashboard. Uses client component so tools list refetches when user switches location in GHL (postMessage locationId) without page refresh.
 */
export default function DashboardPage() {
  return <DashboardClient />;
}
