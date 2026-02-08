'use client';

import { useCallback, useEffect, useState } from 'react';
import { useGHLIframe } from '@/lib/ghl-iframe-context';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function SetupPage() {
  const { ghlData, loading } = useGHLIframe();
  const [oauthStatus, setOauthStatus] = useState<{
    installed: boolean;
    locationId?: string;
  } | null>(null);
  const [loadingOAuth, setLoadingOAuth] = useState(true);

  const fetchOAuthStatus = useCallback(() => {
    if (!ghlData?.locationId) return;
    fetch(`/api/auth/oauth/status?locationId=${ghlData.locationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOauthStatus(d ?? { installed: false }))
      .catch(() => setOauthStatus({ installed: false }))
      .finally(() => setLoadingOAuth(false));
  }, [ghlData?.locationId]);

  useEffect(() => {
    if (!loading && ghlData?.locationId) {
      fetchOAuthStatus();
    } else if (!loading) {
      setLoadingOAuth(false);
    }
  }, [loading, ghlData?.locationId, fetchOAuthStatus]);

  // Refetch when tab becomes visible (user returned from OAuth)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchOAuthStatus();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [fetchOAuthStatus]);

  const handleOAuthInstall = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const authUrl = new URL('/api/auth/oauth/authorize', base);
    if (ghlData?.locationId) authUrl.searchParams.set('locationId', ghlData.locationId);
    authUrl.searchParams.set('redirect', '/dashboard');
    console.log('[CQ OAuth]', 'setup: starting OAuth install', { locationId: ghlData?.locationId ? `${ghlData.locationId.slice(0, 8)}...` : null });
    // Same-window redirect so callback and oauth-success run in same tab — session cookie then works for dashboard
    window.location.href = authUrl.toString();
  };

  if (loading || (ghlData && loadingOAuth)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!ghlData?.locationId) {
    return (
      <div className="mx-auto max-w-xl space-y-6 p-4">
        <Card>
          <CardHeader>
            <CardTitle>Setup Required</CardTitle>
            <CardDescription>
              Open this app from a GoHighLevel sub-account dashboard (not Agency view) to get location context.
              Configure your GHL Marketplace App with Shared Secret in Advanced Settings → Auth.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">CRM Setup</h1>

      <Card>
        <CardHeader>
          <CardTitle>OAuth Installation</CardTitle>
          <CardDescription>
            Install via OAuth for secure, per-location authentication (recommended for marketplace apps).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {oauthStatus?.installed ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>App installed for location: {oauthStatus.locationId ?? ghlData.locationId}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <span>OAuth not installed for this location.</span>
            </div>
          )}
          <Button onClick={handleOAuthInstall} variant={oauthStatus?.installed ? 'secondary' : 'default'}>
            {oauthStatus?.installed ? 'Reinstall OAuth' : 'Install via OAuth'}
          </Button>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">
        After OAuth installation, return to the dashboard to use the CRM.
      </p>
      <Link href="/dashboard">
        <Button variant="outline">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
