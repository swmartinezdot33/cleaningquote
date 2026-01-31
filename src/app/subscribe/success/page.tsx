'use client';

import '../globals.css';
import Link from 'next/link';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { CheckCircle, Mail, ArrowRight } from 'lucide-react';

/**
 * Post-checkout success page. Stripe redirects here after payment (success_url).
 * User is not logged in yet — the webhook creates the account asynchronously.
 * This page explains that and directs them to sign in (magic link or set-password email).
 */
export default function SubscribeSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <Link href="/" className="inline-block">
          <BrandLogo />
        </Link>
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30 p-6 text-left">
          <div className="flex gap-3">
            <CheckCircle className="h-6 w-6 shrink-0 text-green-600 dark:text-green-500 mt-0.5" />
            <div className="space-y-2">
              <h1 className="text-lg font-semibold text-foreground">Payment successful</h1>
              <p className="text-sm text-muted-foreground">
                Your account is being set up. <strong>Check your email</strong> for an account confirmation from <strong>team@cleanquote.io</strong>.
              </p>
              <p className="text-sm text-muted-foreground">
                That email contains a link to set your password and sign in. Use it to access your dashboard.
              </p>
              <p className="text-sm text-muted-foreground">
                If you don&apos;t see it, check your spam folder and make sure you're looking at the inbox for the <strong>email you used at checkout</strong>.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <p className="text-sm text-muted-foreground">
            After you&apos;ve set your password from the email, sign in here to access your dashboard.
          </p>
          <Button size="lg" className="w-full gap-2" asChild>
            <Link href="/login?redirect=/dashboard">
              <Mail className="h-4 w-4" />
              Go to sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Didn&apos;t get the email from team@cleanquote.io? Check spam, or use &quot;Email me a magic link&quot; on the sign-in page with your checkout email.
          </p>
        </div>
        <Link href="/" className="text-sm text-muted-foreground hover:text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </div>
  );
}
