import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard, isSuperAdminEmail, orgHasActiveAccess } from '@/lib/org-auth';
import { BrandLogo } from '@/components/BrandLogo';
import { OrgSwitcher } from '@/components/OrgSwitcher';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

  const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
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

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-4">
            {orgs.length > 0 && (
              <OrgSwitcher orgs={orgs} selectedOrgId={selectedOrgId} />
            )}
            {isSuperAdminEmail(user.email ?? undefined) && (
              <>
                <Link
                  href="/dashboard/super-admin/inbox"
                  className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
                >
                  Inbox
                </Link>
                <Link
                  href="/dashboard/super-admin"
                  className="text-sm font-medium text-amber-600 hover:text-amber-700 hover:underline"
                >
                  Super Admin
                </Link>
              </>
            )}
            <Link
              href="/dashboard"
              className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
            >
              Tools
            </Link>
            <Link
              href="/dashboard/quotes"
              className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
            >
              Quotes
            </Link>
            {selectedOrg?.role === 'admin' && (
              <Link
                href="/dashboard/team"
                className="text-sm font-medium text-muted-foreground hover:text-primary hover:underline"
              >
                Team
              </Link>
            )}
            <Link
              href="/dashboard/profile"
              className="text-sm font-medium text-foreground hover:text-primary hover:underline"
            >
              {user.user_metadata?.full_name || user.user_metadata?.display_name || user.email}
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium text-primary hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main key={selectedOrgId ?? 'none'} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
