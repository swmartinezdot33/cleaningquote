'use client';

import { useEffect, useState } from 'react';
import { GHLIframeProvider } from '@/lib/ghl-iframe-context';
import { DashboardContextProvider, useDashboardContext } from '@/lib/dashboard-context';
import { DashboardHeader } from '@/app/dashboard/DashboardHeader';
import { LoadingDots } from '@/components/ui/loading-dots';

interface GHLSession {
  locationId: string;
  companyId: string;
  userId: string;
}

interface DashboardGHLWrapperProps {
  children: React.ReactNode;
  userDisplayName: string;
  ghlSession?: GHLSession | null;
}

/**
 * Renders dashboard content (header + main) or a blocking/loading message.
 * Always mounted when providers are mounted so hook order is stable (avoids React #310).
 */
function DashboardContentWithHeader({
  children,
  userDisplayName,
  ghlSession,
  inIframe,
}: DashboardGHLWrapperProps & { inIframe: boolean | null }) {
  const { orgs, selectedOrgId, org } = useDashboardContext();

  if (inIframe === false) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-medium text-foreground">Open inside CleanQuote.io</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Open this page inside of CleanQuote.io. Do not open this URL directly in a browser tab.
        </p>
      </div>
    );
  }
  if (inIframe === null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <LoadingDots size="lg" className="text-muted-foreground" />
      </div>
    );
  }
  return (
    <>
      <DashboardHeader
        orgs={orgs}
        selectedOrgId={selectedOrgId}
        selectedOrgRole={org?.role}
        userDisplayName={userDisplayName}
        isSuperAdmin={false}
        ghlSession={ghlSession ?? undefined}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 overflow-x-hidden">{children}</main>
    </>
  );
}

/**
 * Dashboard is only available when loaded inside a GHL iframe.
 * We always mount the same provider + content tree so hook count is stable (avoids React error #310).
 */
export function DashboardGHLWrapper({ children, userDisplayName, ghlSession }: DashboardGHLWrapperProps) {
  const [inIframe, setInIframe] = useState<boolean | null>(null);

  useEffect(() => {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    setInIframe(isInIframe);
    console.log('[CQ OAuth]', `[${Date.now()}] DashboardGHLWrapper: inIframe=${isInIframe}`, isInIframe ? 'showing dashboard' : 'blocked (not in iframe)');
  }, []);

  return (
    <GHLIframeProvider>
      <DashboardContextProvider>
        <DashboardContentWithHeader
          userDisplayName={userDisplayName}
          ghlSession={ghlSession}
          inIframe={inIframe}
        >
          {children}
        </DashboardContentWithHeader>
      </DashboardContextProvider>
    </GHLIframeProvider>
  );
}
