'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

function OAuthSuccessContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const locationId = searchParams.get('locationId');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const isSuccess = success === 'oauth_installed' && locationId;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 text-center">
        {isSuccess ? (
          <>
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h1 className="mt-4 text-xl font-semibold">OAuth Installation Successful</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              The app is now connected to your CRM location. Open CleanQuote from your GHL sidebar or app launcher to use the dashboard.
            </p>
            <a href="https://my.cleanquote.io" target="_blank" rel="noopener noreferrer" className="mt-6 block">
              <Button className="w-full">Go to GoHighLevel</Button>
            </a>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-16 w-16 text-destructive" />
            <h1 className="mt-4 text-xl font-semibold">OAuth Error</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {error ? `${error}${errorDescription ? `: ${errorDescription}` : ''}` : 'An error occurred during OAuth installation.'}
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <OAuthSuccessContent />
    </Suspense>
  );
}
