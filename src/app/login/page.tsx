'use client';

import '../globals.css';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { BrandLogo } from '@/components/BrandLogo';
import { Mail, Lock, Link2 } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';

  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'login/page.tsx:LoginForm-mount', message: 'LoginForm mounted', data: { redirect }, timestamp: Date.now() }) }).catch(() => {});
  }, [redirect]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    if (hash.includes('access_token') || hash.includes('refresh_token')) {
      window.location.href = `/auth/set-password${hash}`;
    }
  }, []);
  const prefilledEmail = searchParams.get('email') ?? '';
  const [email, setEmail] = useState(prefilledEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const message =
          signInError.message === 'Invalid login credentials'
            ? 'Invalid email or password. Please try again.'
            : signInError.message.includes('Email not confirmed')
              ? 'Please check your email and confirm your account before signing in.'
              : signInError.message;
        setError(message);
        setLoading(false);
        return;
      }
      window.location.href = redirect;
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message.includes('Missing NEXT_PUBLIC_SUPABASE') ? 'App is not configured for sign-in. Please contact support.' : message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter your email to receive a sign-in link.');
      return;
    }
    setMagicLinkLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(redirect)}`;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });
      if (otpError) {
        const isRedirectError = /redirect|url|allowed/i.test(otpError.message);
        const hint = isRedirectError && typeof window !== 'undefined'
          ? ` Add ${window.location.origin}/auth/callback to Supabase → Auth → URL Configuration → Redirect URLs.`
          : '';
        setError(otpError.message + hint);
        setMagicLinkLoading(false);
        return;
      }
      setMagicLinkSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message.includes('Missing NEXT_PUBLIC_SUPABASE') ? 'App is not configured for sign-in. Please contact support.' : message);
    } finally {
      setMagicLinkLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-6">
          <BrandLogo />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              CleanQuote.io — secure sign-in
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          {magicLinkSent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-6 w-6" />
              </div>
              <h2 className="font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a sign-in link to <strong className="text-foreground">{email}</strong>. Click the link in that email to sign in. The link expires in 1 hour.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn&apos;t get it? Check spam or{' '}
                <button
                  type="button"
                  onClick={() => setMagicLinkSent(false)}
                  className="font-medium text-primary hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <>
              <form method="post" onSubmit={handlePasswordSubmit} className="space-y-6" action="#">
                {error && (
                  <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" aria-live="assertive">
                    {error}
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  {loading ? 'Signing in…' : 'Sign in with password'}
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wider text-muted-foreground">
                  <span className="bg-card px-2">or</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No password? We&apos;ll email you a one-time sign-in link.
                </p>
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={magicLinkLoading}
                  className="w-full flex justify-center items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
                >
                  <Link2 className="h-4 w-4" />
                  {magicLinkLoading ? 'Sending…' : 'Email me a magic link'}
                </button>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/?signup=1" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-muted/30">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
