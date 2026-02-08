'use client';

/**
 * When no GHL session: allow only /dashboard/setup (iframe gets locationId, then authorize?locationId=). See GHL_IFRAME_APP_AUTH.md.
 */
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GHLIframeProvider } from '@/lib/ghl-iframe-context';

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/dashboard/setup') return;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'DashboardGate.tsx',
        message: 'no session: replacing with open-from-ghl',
        data: { pathname, hypothesisId: 'H2' },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    router.replace('/open-from-ghl');
  }, [pathname, router]);

  if (pathname !== '/dashboard/setup') {
    return null;
  }

  return <GHLIframeProvider>{children}</GHLIframeProvider>;
}
