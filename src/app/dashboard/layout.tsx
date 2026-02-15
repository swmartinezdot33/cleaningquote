import type { Metadata } from 'next';
import { getSession } from '@/lib/ghl/session';
import { DashboardGHLWrapper } from '@/app/dashboard/DashboardGHLWrapper';

/** Force dynamic rendering so dashboard pages are not statically prerendered (they use GHL context, searchParams, etc.). */
export const dynamic = 'force-dynamic';

/** Title bar shows "Page | CleanQuote.io" for all dashboard views. */
export const metadata: Metadata = {
  title: { template: '%s | CleanQuote.io', default: 'Dashboard | CleanQuote.io' },
};

/**
 * Dashboard relies solely on GHL iframe context (locationId from postMessage or URL).
 * Org and header are provided by DashboardContextProvider inside DashboardGHLWrapper.
 * We do not block layout on getOrFetchCurrentUser so the dashboard shell renders immediately.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ghlSession: Awaited<ReturnType<typeof getSession>> = null;

  try {
    ghlSession = await getSession();
  } catch {
    // getSession can throw if cookies() or env fails; render with defaults so page loads
  }

  // Do not await getOrFetchCurrentUser here — it blocks the whole dashboard on a GHL API call.
  // Header shows "Account" until client can optionally warm the user cache.
  const userDisplayName = 'Account';

  return (
    <div className="dashboard-root min-h-screen bg-muted/30">
      <DashboardGHLWrapper userDisplayName={userDisplayName} ghlSession={ghlSession ?? undefined}>
        {children}
      </DashboardGHLWrapper>
    </div>
  );
}
