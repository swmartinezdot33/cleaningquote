'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check } from 'lucide-react';

function InviteSuccessContent() {
  const searchParams = useSearchParams();
  const org = searchParams?.get('org') ?? 'the team';
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          window.location.href = '/dashboard';
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="mx-auto max-w-md text-center">
        <div className="animate-success-pop mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Check className="animate-success-check h-10 w-10 text-primary" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold">Account created successfully!</h1>
        <p className="mt-3 text-muted-foreground">
          You&apos;ve joined <strong>{org}</strong>. Redirecting to your dashboard…
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          {countdown > 0 ? (
            <>Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}…</>
          ) : (
            <>Taking you to the dashboard…</>
          )}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          Go to dashboard now
        </Link>
      </div>
    </div>
  );
}

export default function InviteSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <InviteSuccessContent />
    </Suspense>
  );
}
