'use client';

import { useGHLIframe } from '@/lib/ghl-iframe-context';
import { Loader2 } from 'lucide-react';

interface LocationGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** When true, allow rendering without locationId (e.g. when using Supabase/org flow) */
  allowWithoutLocation?: boolean;
}

/**
 * Blocks rendering until locationId is available from GHL iframe context.
 * Use when the dashboard is loaded inside GHL and all data is location-scoped.
 */
export function LocationGuard({ children, fallback, allowWithoutLocation }: LocationGuardProps) {
  const { ghlData, loading, error } = useGHLIframe();

  if (loading && !ghlData?.locationId) {
    return (
      fallback ?? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Waiting for location context from CRM…</p>
          </div>
        </div>
      )
    );
  }

  if (allowWithoutLocation) {
    return <>{children}</>;
  }

  if (error || !ghlData?.locationId) {
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
    return (
      fallback ?? (
        <div className="flex min-h-[40vh] items-center justify-center p-4">
          <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">Location context required</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {error ?? 'This app must be loaded within GoHighLevel to access location-specific data.'}
            </p>
            {isInIframe && (
              <p className="mt-3 text-left text-sm text-muted-foreground">
                <strong>Setup:</strong> In GHL SaaS Configurator → Marketplace Apps → CleanQuote.io → Edit the app URL to include:{' '}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">?locationId={'{{'}location.id{'}}'}</code>
              </p>
            )}
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
