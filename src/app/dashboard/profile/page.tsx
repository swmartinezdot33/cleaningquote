import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { ensureUserOrgs } from '@/lib/org-auth';
import { ProfileForm } from './ProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

const billingPortalUrl = process.env.NEXT_PUBLIC_STRIPE_BILLING_PORTAL_URL ?? '';

export default async function ProfilePage() {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard/profile');
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.display_name as string | undefined) ||
    '';

  const orgs = await ensureUserOrgs(user.id, user.email ?? undefined);
  const cookieStore = await cookies();
  const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id ?? null;
  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0] ?? null;
  const isAdminOfSelectedOrg = selectedOrg?.role === 'admin';
  const selectedOrgHasStripe = !!selectedOrg?.stripe_customer_id;
  const showBilling = billingPortalUrl.startsWith('http') && isAdminOfSelectedOrg && selectedOrgHasStripe;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your display name, email, and password.
        </p>
      </div>
      <ProfileForm initialDisplayName={displayName} initialEmail={user.email ?? ''} />
      {showBilling && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing
            </CardTitle>
            <CardDescription>
              Manage subscription, payment method, and invoices for this organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href={billingPortalUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Manage billing
              </Button>
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
