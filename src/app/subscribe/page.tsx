'use client';

import '../globals.css';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowRight } from 'lucide-react';

const stripeCheckoutUrl = process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL ?? '';

export default function SubscribePage() {
  const hasCheckoutUrl = stripeCheckoutUrl.startsWith('http');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <Link href="/" className="inline-block">
          <BrandLogo />
        </Link>
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500">
            <CreditCard className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-xl font-semibold text-foreground">
            Subscription required
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Your 14-day free trial has ended or your payment could not be completed. To continue using CleanQuote.io, please update your payment or start a new subscription.
          </p>
          {hasCheckoutUrl ? (
            <a
              href={stripeCheckoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex w-full justify-center"
            >
              <Button size="lg" className="w-full gap-2">
                Restore access — pay via Stripe
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Contact support to restore your access.
            </p>
          )}
          <p className="mt-6 text-xs text-muted-foreground">
            After paying, you’ll get access again. If you have another organization with an active subscription, switch to it from the dashboard.
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
    </div>
  );
}
