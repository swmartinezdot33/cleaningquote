import Link from 'next/link';

/**
 * Shown when user tries to access the dashboard without coming from GHL.
 * CleanQuote is a GHL-integrated app — users must open it from within GoHighLevel.
 */
export default function OpenFromGHLPage() {
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
        <Link
          href="https://app.gohighlevel.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Go to GoHighLevel
        </Link>
      </div>
    </div>
  );
}
