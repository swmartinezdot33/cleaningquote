import { getSession } from '@/lib/ghl/session';
import { getOrFetchCurrentUser } from '@/lib/ghl/user-cache';
import { DashboardGHLWrapper } from '@/app/dashboard/DashboardGHLWrapper';

/**
 * Dashboard relies solely on GHL iframe context (locationId from postMessage or URL).
 * Org and header are provided by DashboardContextProvider inside DashboardGHLWrapper.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ghlSession = await getSession();
  let userDisplayName = 'Account';
  if (ghlSession?.userId && ghlSession?.locationId) {
    try {
      const user = await getOrFetchCurrentUser(ghlSession.locationId, ghlSession.userId);
      if (user?.name) userDisplayName = user.name;
      else if (user?.firstName || user?.lastName) userDisplayName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || userDisplayName;
      else if (user?.email) userDisplayName = user.email;
    } catch {
      // non-fatal
    }
  }

  return (
    <div className="dashboard-root min-h-screen bg-muted/30">
      <DashboardGHLWrapper userDisplayName={userDisplayName} ghlSession={ghlSession ?? undefined}>
        {children}
      </DashboardGHLWrapper>
    </div>
  );
}
