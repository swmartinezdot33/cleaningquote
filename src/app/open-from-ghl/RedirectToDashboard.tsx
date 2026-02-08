'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side redirect to /dashboard. Used when open-from-ghl has a session
 * so the next load is a client navigation (cookie is sent with RSC fetch) and
 * we avoid a server-redirect loop that caused "Throttling navigation" / flicker.
 */
export function RedirectToDashboard() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <p className="text-sm text-muted-foreground">Redirecting to dashboard…</p>
    </div>
  );
}
