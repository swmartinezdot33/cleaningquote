'use client';

import { useEffect, useState } from 'react';
import { GHLIframeProvider } from '@/lib/ghl-iframe-context';

/**
 * Dashboard is only available when loaded inside a GHL iframe.
 * When not in an iframe, do not load the dashboard at all — show a blocking message.
 */
export function DashboardGHLWrapper({ children }: { children: React.ReactNode }) {
  const [inIframe, setInIframe] = useState<boolean | null>(null);

  useEffect(() => {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    setInIframe(isInIframe);
    console.log('[CQ OAuth]', `[${Date.now()}] DashboardGHLWrapper: inIframe=${isInIframe}`, isInIframe ? 'showing dashboard' : 'blocked (not in iframe)');
  }, []);

  if (inIframe === true) {
    return <GHLIframeProvider>{children}</GHLIframeProvider>;
  }
  if (inIframe === false) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-medium text-foreground">Open from GoHighLevel</p>
        <p className="max-w-md text-sm text-muted-foreground">
          This app runs only inside GoHighLevel. Open it from your location dashboard or app menu in GoHighLevel — do not open this URL directly in a browser tab.
        </p>
      </div>
    );
  }
  return null;
}
