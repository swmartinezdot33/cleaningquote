import { getSession } from '@/lib/ghl/session';
import { getOrFetchCurrentUser } from '@/lib/ghl/user-cache';
import { DashboardHeader } from '@/app/dashboard/DashboardHeader';
import { DashboardGHLWrapper } from '@/app/dashboard/DashboardGHLWrapper';

/**
 * Dashboard relies solely on GHL iframe context (locationId from postMessage or URL).
 * No NextAuth or Supabase user login required — we never gate on server-side session.
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
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader
        orgs={[]}
        selectedOrgId={null}
        selectedOrgRole={undefined}
        userDisplayName={userDisplayName}
        isSuperAdmin={false}
        ghlSession={ghlSession ?? undefined}
      />
      <DashboardGHLWrapper>
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 overflow-x-hidden">{children}</main>
      </DashboardGHLWrapper>
    </div>
  );
}
