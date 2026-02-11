import Link from 'next/link';
import { getSession } from '@/lib/ghl/session';
import { getGHLMarketplaceAppUrl } from '@/lib/ghl/oauth-utils';
import { RedirectToDashboard } from './RedirectToDashboard';
import { OpenFromGHLLogger } from './OpenFromGHLLogger';

/**
 * Shown when user tries to access the dashboard without a valid session.
 * If they have a session, we client-side redirect to dashboard to avoid a server-redirect loop (flicker / navigation throttle).
 */
export default async function OpenFromGHLPage() {
  const session = await getSession();
  console.log('[CQ open-from-ghl] getSession result', { hasSession: !!session, willRedirect: !!session });
  if (session) {
    return <RedirectToDashboard />;
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <OpenFromGHLLogger />
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Open inside CleanQuote.io</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          We didn&apos;t receive your user context. Open this page inside of CleanQuote.io from your app or dashboard so we can identify you.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          If you haven&apos;t installed CleanQuote yet, add it from the App Marketplace.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={getGHLMarketplaceAppUrl()}
            className="inline-block rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Install CleanQuote (Marketplace)
          </Link>
          <Link
            href="/dashboard"
            className="inline-block rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
          >
            Try Dashboard (if you just installed)
          </Link>
        </div>
      </div>
    </div>
  );
}
