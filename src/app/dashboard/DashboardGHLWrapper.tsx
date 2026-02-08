'use client';

import { useEffect, useState } from 'react';
import { GHLIframeProvider } from '@/lib/ghl-iframe-context';

/**
 * Wraps dashboard content with GHL iframe context when in iframe.
 * When user has session (we only render when layout had session), show dashboard in both iframe and normal tab — same as working GHL marketplace apps. No redirect loop.
 */
export function DashboardGHLWrapper({ children }: { children: React.ReactNode }) {
  const [inIframe, setInIframe] = useState<boolean | null>(null);

  useEffect(() => {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    setInIframe(isInIframe);
    console.log('[CQ OAuth]', `[${Date.now()}] DashboardGHLWrapper: inIframe=${isInIframe}, showing dashboard`);
  }, []);

  // Session already valid (layout checked). Show dashboard; wrap with iframe context only when in iframe so locationId/postMessage available.
  if (inIframe === true) {
    return <GHLIframeProvider>{children}</GHLIframeProvider>;
  }
  if (inIframe === false) {
    return <>{children}</>;
  }
  return null;
}
