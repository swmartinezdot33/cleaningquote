import Link from 'next/link';
import { getSession } from '@/lib/ghl/session';
import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';

/**
 * GHL-only dashboard. No Supabase — data comes from GHL API via OAuth token for current location.
 */
export default async function DashboardPage() {
  const ghlSession = await getSession();

  if (!ghlSession) {
    return null;
  }

  const token = await getOrFetchTokenForLocation(ghlSession.locationId);
  if (token) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">You&apos;re connected to your location.</p>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/dashboard/quotes"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Quotes
          </Link>
          <Link
            href="/dashboard/crm"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted/50"
          >
            CRM
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
      <p className="text-muted-foreground">Reconnect to load your CRM data.</p>
      <Link
        href="/dashboard/setup"
        className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Connect location
      </Link>
    </div>
  );
}
