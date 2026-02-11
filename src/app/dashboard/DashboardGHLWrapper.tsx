'use client';

import { useEffect, useState } from 'react';
import { GHLIframeProvider } from '@/lib/ghl-iframe-context';
import { DashboardContextProvider, useDashboardContext } from '@/lib/dashboard-context';
import { DashboardHeader } from '@/app/dashboard/DashboardHeader';

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
 * Dashboard is only available when loaded inside a GHL iframe.
 * When not in iframe, do not load the dashboard at all — show a blocking message.
 * When in iframe: provides GHL + Dashboard context and renders header with org from context.
 */
function DashboardContentWithHeader({
  children,
  userDisplayName,
  ghlSession,
}: DashboardGHLWrapperProps) {
  const { orgs, selectedOrgId, org } = useDashboardContext();
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

export function DashboardGHLWrapper({ children, userDisplayName, ghlSession }: DashboardGHLWrapperProps) {
  const [inIframe, setInIframe] = useState<boolean | null>(null);

  useEffect(() => {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    setInIframe(isInIframe);
    console.log('[CQ OAuth]', `[${Date.now()}] DashboardGHLWrapper: inIframe=${isInIframe}`, isInIframe ? 'showing dashboard' : 'blocked (not in iframe)');
  }, []);

  if (inIframe === true) {
    return (
      <GHLIframeProvider>
        <DashboardContextProvider>
          <DashboardContentWithHeader userDisplayName={userDisplayName} ghlSession={ghlSession}>
            {children}
          </DashboardContentWithHeader>
        </DashboardContextProvider>
      </GHLIframeProvider>
    );
  }
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
  return null;
}
