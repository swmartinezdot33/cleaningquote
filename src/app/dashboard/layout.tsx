import { getSession } from '@/lib/ghl/session';
import { DashboardHeader } from '@/app/dashboard/DashboardHeader';
import { DashboardGHLWrapper } from '@/app/dashboard/DashboardGHLWrapper';
import { DashboardGate } from '@/app/dashboard/DashboardGate';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ghlSession = await getSession();
  console.log('[CQ Dashboard layout] getSession result', { hasSession: !!ghlSession, locationId: ghlSession?.locationId ? ghlSession.locationId.slice(0, 12) + '...' : null });
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: 'dashboard/layout.tsx',
      message: ghlSession ? 'dashboard layout has session' : 'dashboard layout no session, rendering Gate',
      data: { hasSession: !!ghlSession, hypothesisId: 'H1' },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (ghlSession) {
    return (
      <div className="min-h-screen bg-muted/30">
        <DashboardHeader
          orgs={[]}
          selectedOrgId={null}
          selectedOrgRole={undefined}
          userDisplayName="Account"
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
