import { redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getOrgsForDashboard } from '@/lib/org-auth';
import { ProfileForm } from './ProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Building2, PlusCircle } from 'lucide-react';

const billingPortalUrl = process.env.NEXT_PUBLIC_STRIPE_BILLING_PORTAL_URL ?? '';
const stripeCheckoutUrl = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL ?? '';

function subscriptionStatusLabel(status: string | null | undefined): string {
  if (!status) return 'Not linked';
  const labels: Record<string, string> = {
    active: 'Active',
    trialing: 'Free trial',
    past_due: 'Past due',
    canceled: 'Canceled',
    unpaid: 'Unpaid',
    incomplete: 'Incomplete',
    incomplete_expired: 'Expired',
  };
  return labels[status] ?? status;
}

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

  const orgs = await getOrgsForDashboard(user.id, user.email ?? undefined);
  const cookieStore = await cookies();
  const selectedOrgId = cookieStore.get('selected_org_id')?.value ?? orgs[0]?.id ?? null;
  const selectedOrg = orgs.find((o) => o.id === selectedOrgId) ?? orgs[0] ?? null;
  const isAdminOfSelectedOrg = selectedOrg?.role === 'admin';
  const selectedOrgHasStripe = !!selectedOrg?.stripe_customer_id;
  const showBilling = billingPortalUrl.startsWith('http') && isAdminOfSelectedOrg && selectedOrgHasStripe;
  const subscriptionStatus = selectedOrg?.subscription_status ?? null;

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

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & subscription
          </CardTitle>
          <CardDescription>
            Subscription is tied to the organization. Use the org switcher in the header to change which org you’re viewing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedOrg && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Current org:</span>
              <span className="font-medium text-foreground">{selectedOrg.name}</span>
              <span className="text-muted-foreground">·</span>
              <span className={selectedOrgHasStripe ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                {selectedOrgHasStripe
                  ? subscriptionStatusLabel(subscriptionStatus)
                  : 'Not linked to Stripe'}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {showBilling && (
              <a href={billingPortalUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Manage billing
                </Button>
              </a>
            )}
            {stripeCheckoutUrl.startsWith('http') && (
              <a href={stripeCheckoutUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Add another org
                </Button>
              </a>
            )}
          </div>
          {!showBilling && (
            <p className="text-sm text-muted-foreground">
              {!billingPortalUrl.startsWith('http')
                ? 'Manage billing is not configured (NEXT_PUBLIC_STRIPE_BILLING_PORTAL_URL is missing or invalid).'
                : !isAdminOfSelectedOrg
                  ? 'Only org admins can manage billing. Switch to an org where you’re an admin.'
                  : !selectedOrgHasStripe
                    ? 'This org is not linked to Stripe yet. Complete Stripe Checkout (e.g. from the Get started or Subscribe flow) to link it; then you’ll see Manage billing here.'
                    : 'Manage billing is unavailable for this org.'}
            </p>
          )}
          {stripeCheckoutUrl.startsWith('http') && (
            <p className="text-xs text-muted-foreground">
              Add another org opens Stripe Checkout to start a new subscription ($297/org). The new org will appear in your org switcher after checkout.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
