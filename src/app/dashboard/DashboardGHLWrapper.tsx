'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GHLIframeProvider } from '@/lib/ghl-iframe-context';

/**
 * Wraps dashboard content with GHL iframe context.
 * Dashboard only loads when inside a GHL iframe — otherwise redirects to /open-from-ghl.
 */
export function DashboardGHLWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [inIframe, setInIframe] = useState<boolean | null>(null);

  useEffect(() => {
    const isInIframe = window.self !== window.top;
    if (!isInIframe) {
      console.log('[CQ OAuth]', `[${Date.now()}] DashboardGHLWrapper: not in iframe → replace /open-from-ghl`);
      router.replace('/open-from-ghl');
      return;
    }
    console.log('[CQ OAuth]', `[${Date.now()}] DashboardGHLWrapper: in iframe → show dashboard`);
    setInIframe(true);
  }, [router]);

  if (inIframe !== true) {
    return null;
  }

  return <GHLIframeProvider>{children}</GHLIframeProvider>;
}
