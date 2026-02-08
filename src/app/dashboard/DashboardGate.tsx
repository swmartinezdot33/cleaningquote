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
    router.replace('/open-from-ghl');
  }, [pathname, router]);

  if (pathname !== '/dashboard/setup') {
    return null;
  }

  return <GHLIframeProvider>{children}</GHLIframeProvider>;
}
