'use client';

import { GHLIframeProvider } from '@/lib/ghl-iframe-context';

/**
 * Wraps dashboard content with GHL iframe context.
 * When CleanQuote runs inside GHL (iframe), this provides locationId and user info from GHL.
 */
export function DashboardGHLWrapper({ children }: { children: React.ReactNode }) {
  return <GHLIframeProvider>{children}</GHLIframeProvider>;
}
