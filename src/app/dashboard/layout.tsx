import { redirect } from 'next/navigation';
import { getSession } from '@/lib/ghl/session';
import { DashboardHeader } from '@/app/dashboard/DashboardHeader';
import { DashboardGHLWrapper } from '@/app/dashboard/DashboardGHLWrapper';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ghlSession = await getSession();

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

  // GHL-only: no session → redirect
  redirect('/open-from-ghl');
}
