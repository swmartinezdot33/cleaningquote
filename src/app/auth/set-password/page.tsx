'use client';

import '../../globals.css';
import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * CleanQuote uses GoHighLevel for sign-in. No Supabase set-password flow.
 * Redirect to open-from-ghl.
 */
function SetPasswordContent() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/open-from-ghl');
  }, [router]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <p className="text-muted-foreground">Redirecting…</p>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">Redirecting…</p>
      </div>
    }>
      <SetPasswordContent />
    </Suspense>
  );
}
