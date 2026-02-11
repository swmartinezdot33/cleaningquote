'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingDots } from '@/components/ui/loading-dots';

const LOG = '[CQ OAuth]';
const AUTO_REDIRECT_SEC = 3;

type KvCheckResult = {
  tokenExistsInKV?: boolean;
  hasAccessToken?: boolean;
  hasRefreshToken?: boolean;
  locationIdLookedUp?: string;
  error?: string;
} | null;

function OAuthSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const success = searchParams?.get('success');
  const locationId = searchParams?.get('locationId');
  const error = searchParams?.get('error');
  const errorDescription = searchParams?.get('error_description');

  const isSuccess = success === 'oauth_installed' && locationId;
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SEC);
  const [kvCheck, setKvCheck] = useState<KvCheckResult>(null);

  useEffect(() => {
    const t = Date.now();
    console.log(LOG, `[${t}] oauth-success: page load`, { success: success ?? null, locationId: locationId ? `${locationId.slice(0, 8)}...` : null, error: error ?? null, isSuccess });
  }, [success, locationId, error, isSuccess]);

  // Verify KV storage when we have a successful install + locationId (feedback that data was stored)
  useEffect(() => {
    if (!isSuccess || !locationId) return;
    const url = `/api/dashboard/ghl/kv-check?locationId=${encodeURIComponent(locationId)}`;
    fetch(url, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setKvCheck(data);
        const stored = data.tokenExistsInKV === true && data.hasAccessToken && data.hasRefreshToken;
        console.log(LOG, '[CQ OAuth] KV storage verification:', {
          message: stored ? 'Data was stored in KV for this location.' : 'KV check result:',
          locationIdLookedUp: data.locationIdLookedUp,
          tokenExistsInKV: data.tokenExistsInKV,
          hasAccessToken: data.hasAccessToken,
          hasRefreshToken: data.hasRefreshToken,
        });
        if (stored) {
          console.log(LOG, '[CQ OAuth] Installation data stored successfully. LocationId:', locationId.slice(0, 8) + '..' + locationId.slice(-4));
        }
      })
      .catch((err) => {
        console.warn(LOG, '[CQ OAuth] KV check request failed:', err);
        setKvCheck({ error: err instanceof Error ? err.message : 'Request failed' });
      });
  }, [isSuccess, locationId]);

  // Same as GHL template / Maid Central: after callback success, send user into the app (auto-redirect to dashboard)
  useEffect(() => {
    if (!isSuccess) return;
    if (countdown <= 0) {
      console.log(LOG, `[${Date.now()}] oauth-success: auto-redirect to /dashboard`);
      router.replace('/dashboard');
      return;
    }
    if (countdown === AUTO_REDIRECT_SEC) {
      console.log(LOG, `[${Date.now()}] oauth-success: countdown started ${AUTO_REDIRECT_SEC}s`);
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isSuccess, countdown, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center">
        {isSuccess ? (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="mt-4 text-xl font-semibold">OAuth Installation Successful</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app is now connected to your CRM location. Opening your dashboard…
            </p>
            {kvCheck !== null && (
              <div className="mt-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-left text-sm">
                <p className="font-medium text-foreground">Storage</p>
                {kvCheck.error ? (
                  <p className="mt-1 text-amber-600 dark:text-amber-400">Could not verify: {kvCheck.error}</p>
                ) : kvCheck.tokenExistsInKV && kvCheck.hasAccessToken && kvCheck.hasRefreshToken ? (
                  <p className="mt-1 text-green-600 dark:text-green-400">KV storage: verified — tokens stored for this location.</p>
                ) : (
                  <p className="mt-1 text-muted-foreground">KV lookup: {kvCheck.locationIdLookedUp ?? '—'} — token in KV: {kvCheck.tokenExistsInKV ? 'Yes' : 'No'}</p>
                )}
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Redirecting in {countdown}s — or go now:
            </p>
            <Link href="/dashboard" className="mt-4 block">
              <Button className="w-full">Go to Dashboard now</Button>
            </Link>
            <a href="https://www.cleanquote.io" target="_blank" rel="noopener noreferrer" className="mt-3 block">
              <Button variant="outline" className="w-full">Go to GoHighLevel</Button>
            </a>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">OAuth Error</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error === 'storage_failed'
                ? `Tokens could not be saved. ${errorDescription || 'Check server logs.'} Ensure Vercel KV (or KV_REST_API_URL and KV_REST_API_TOKEN) is configured.`
                : error
                  ? `${error}${errorDescription ? `: ${errorDescription}` : ''}`
                  : 'An error occurred during OAuth installation.'}
            </p>
            <Link href="/dashboard/setup" className="mt-6 block">
              <Button variant="outline" className="w-full">
                Try Again
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <LoadingDots size="lg" className="text-primary" />
      </div>
    }>
      <OAuthSuccessContent />
    </Suspense>
  );
}
