import { getSession } from '@/lib/ghl/session';
import { getOrFetchCurrentUser } from '@/lib/ghl/user-cache';
import { DashboardHeader } from '@/app/dashboard/DashboardHeader';
import { DashboardGHLWrapper } from '@/app/dashboard/DashboardGHLWrapper';
import { DashboardGate } from '@/app/dashboard/DashboardGate';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ghlSession = await getSession();
  // When we have user context, lookup current user for display (cached in KV).
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
  if (ghlSession) {
    return (
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader
          orgs={[]}
          selectedOrgId={null}
          selectedOrgRole={undefined}
          userDisplayName={userDisplayName}
          isSuperAdmin={false}
          ghlSession={ghlSession}
        />
        <DashboardGHLWrapper>
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 overflow-x-hidden">{children}</main>
        </DashboardGHLWrapper>
      </div>
    );
  }

  // GHL-only: no session → allow only /dashboard/setup (with iframe context); else gate redirects to open-from-ghl
  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardGate>{children}</DashboardGate>
    </div>
  );
}
