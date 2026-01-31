'use client';

import '../globals.css';
import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { SignupModal } from '@/components/SignupModal';
import { CreditCard, ArrowRight, CheckCircle } from 'lucide-react';

export default function SubscribePage() {
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const searchParams = useSearchParams();
  const fromCheckout = searchParams.get('from_checkout') === '1';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <Link href="/" className="inline-block">
          <BrandLogo />
        </Link>
        {fromCheckout && (
          <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30 p-6 text-left">
            <div className="flex gap-3">
              <CheckCircle className="h-6 w-6 shrink-0 text-green-600 dark:text-green-500 mt-0.5" />
              <div className="space-y-2">
                <h2 className="font-semibold text-foreground">Payment successful</h2>
                <p className="text-sm text-muted-foreground">
                  Your account is being set up. Check the <strong>email you used at checkout</strong> for a link to set your password and sign in to your new organization. If you’re currently signed in with a different account, sign out and use that link.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500">
            <CreditCard className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-foreground">
            {fromCheckout ? 'Need to sign in to your new account?' : 'Subscription required'}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {fromCheckout
              ? 'Use the link in your checkout email to set your password and access your new organization.'
              : 'Your 14-day free trial has ended or your payment could not be completed. To continue using CleanQuote.io, please update your payment or start a new subscription.'}
          </p>
          <Button size="lg" className="mt-6 w-full gap-2" onClick={() => setSignupModalOpen(true)}>
            Restore access — pay via Stripe
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-6 text-xs text-muted-foreground">
            After paying, you'll get access again. If you have another organization with an active subscription, switch to it from the dashboard.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
            Back to dashboard
          </Link>
          <Link href="/login" className="text-sm text-muted-foreground hover:underline">
            Sign in with a different account
          </Link>
        </div>
      </div>
      <SignupModal open={signupModalOpen} onOpenChange={setSignupModalOpen} />
    </div>
  );
}
