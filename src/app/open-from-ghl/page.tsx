import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/ghl/session';

/**
 * Shown when user tries to access the dashboard without a valid session.
 * If they have a session (e.g. just completed OAuth in another tab), send them to dashboard.
 */
export default async function OpenFromGHLPage() {
  const session = await getSession();
  if (session) {
    redirect('/dashboard');
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">Open from GoHighLevel</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          CleanQuote runs inside GoHighLevel. Open it from your sub-account sidebar or app launcher in your CRM dashboard.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          If you haven&apos;t installed CleanQuote yet, add it from the GHL App Marketplace.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="inline-block rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Try Dashboard (if you just installed)
          </Link>
          <Link
            href="https://my.cleanquote.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
          >
            Go to GoHighLevel
          </Link>
        </div>
      </div>
    </div>
  );
}
