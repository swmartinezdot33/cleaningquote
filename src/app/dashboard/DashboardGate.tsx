'use client';

/**
 * When there is no GHL session, allow only /dashboard/setup (with GHL iframe context)
 * so user can install OAuth from inside the iframe. All other paths redirect to open-from-ghl.
 * Matches MaidCentral: setup page gets locationId from iframe and links to authorize?locationId=xxx.
 */
import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { GHLIframeProvider } from '@/lib/ghl-iframe-context';

export function DashboardGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/dashboard/setup') return;
    router.replace('/open-from-ghl');
  }, [pathname, router]);

  if (pathname !== '/dashboard/setup') {
    return null;
  }

  return <GHLIframeProvider>{children}</GHLIframeProvider>;
}
