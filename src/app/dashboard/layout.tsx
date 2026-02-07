import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard, isSuperAdminEmail, orgHasActiveAccess } from '@/lib/org-auth';
import { DashboardHeader } from '@/app/dashboard/DashboardHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/layout.tsx:entry', message: 'DashboardLayout start', data: {}, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) }).catch(() => {});
  // #endregion
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/layout.tsx:afterGetUser', message: 'after getUser', data: { hasUser: !!user }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H4' }) }).catch(() => {});
  // #endregion
  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  let orgs;
  try {
    orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/layout.tsx:afterGetOrgs', message: 'after getOrgsForDashboard', data: { orgCount: orgs?.length ?? 0 }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2' }) }).catch(() => {});
    // #endregion
  } catch (layoutErr) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/layout.tsx:catch', message: 'layout catch', data: { err: String(layoutErr), name: (layoutErr as Error)?.name }, timestamp: Date.now(), sessionId: 'debug-session', hypothesisId: 'H2' }) }).catch(() => {});
    // #endregion
    throw layoutErr;
  }
  const cookieStore = await cookies();
  let selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id ?? null;
  let selectedOrg = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0] ?? null;
  // If super admin had a cookie pointing to an org not in list (e.g. deleted), fall back to first
  if (!selectedOrg && orgs.length > 0) {
    selectedOrgId = orgs[0].id;
    selectedOrg = orgs[0];
  }

  // Require active Stripe subscription for paid orgs (super admins bypass)
  if (selectedOrg && !isSuperAdminEmail(user.email ?? undefined) && !orgHasActiveAccess(selectedOrg)) {
    const orgWithAccess = orgs.find((o) => orgHasActiveAccess(o));
    if (orgWithAccess) {
      selectedOrgId = orgWithAccess.id;
      selectedOrg = orgWithAccess;
    } else {
      // If they just completed checkout (came from dashboard?checkout=success), send to subscribe with hint so we show "check your email"
      const headersList = await headers();
      const fromCheckout = headersList.get('x-checkout-success');
      redirect(fromCheckout ? '/subscribe?from_checkout=1' : '/subscribe');
    }
  }

  const userDisplayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.display_name as string | undefined) ||
    user.email ||
    'Profile';

  return (
    <div className="min-h-screen bg-muted/30">
      <DashboardHeader
        orgs={orgs}
        selectedOrgId={selectedOrgId}
        selectedOrgRole={selectedOrg?.role}
        userDisplayName={userDisplayName}
        isSuperAdmin={isSuperAdminEmail(user.email ?? undefined)}
      />
      <main key={selectedOrgId ?? 'none'} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 overflow-x-hidden">{children}</main>
    </div>
  );
}
