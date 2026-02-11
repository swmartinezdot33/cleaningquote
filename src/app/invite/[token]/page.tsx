'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase/client';

interface InviteData {
  orgName: string;
  email: string;
  role: string;
  authenticated?: boolean;
  emailMatches?: boolean;
}

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) ?? '';
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const params_ = hash ? new URLSearchParams(hash.replace(/^#/, '')) : null;
    const accessToken = params_?.get('access_token');
    const refreshToken = params_?.get('refresh_token');
    if (accessToken && refreshToken) {
      const supabase = createSupabaseBrowser();
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error: setErr }) => {
        if (!setErr) {
          window.location.href = `/auth/set-password?next=${encodeURIComponent(`/invite/${token}`)}`;
        } else {
          setError(setErr.message || 'Could not verify your link.');
        }
      });
      return;
    }
    if (typeof window !== 'undefined' && window.location.hash && !hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInvite(d);
      })
      .catch(() => setError('Failed to load invitation'));
  }, [token]);

  const loginUrl = `/login?redirect=${encodeURIComponent(`/invite/${token}`)}&email=${encodeURIComponent(invite?.email ?? '')}`;

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        // Set selected org to the one they just joined so dashboard shows correct tools
        if (data.orgId) {
          document.cookie = `selected_org_id=${encodeURIComponent(data.orgId)}; path=/; max-age=31536000`;
        } else {
          document.cookie = `selected_org_id=; path=/; max-age=0`;
        }
        const orgParam = invite?.orgName ? `?org=${encodeURIComponent(invite.orgName)}` : '';
        router.push(`/invite/success${orgParam}`);
      } else if (res.status === 401) {
        window.location.href = loginUrl;
      } else {
        setError(data.error ?? 'Failed to accept');
      }
    } finally {
      setAccepting(false);
    }
  };

  if (error && !invite) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-destructive">{error}</p>
        <Link href="/dashboard" className="mt-4 inline-block text-primary hover:underline">
          Go to dashboard
        </Link>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const needsSignIn = !invite.authenticated || !invite.emailMatches;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-lg border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">You&apos;re invited</h1>
        <p className="mt-2 text-muted-foreground">
          Join <strong>{invite.orgName}</strong> as {invite.role}
        </p>
        {invite.email && (
          <p className="mt-1 text-sm text-muted-foreground">Invited as {invite.email}</p>
        )}
        {needsSignIn ? (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              {invite.authenticated && !invite.emailMatches
                ? `Please sign in with ${invite.email} to accept.`
                : 'Sign in to accept this invitation.'}
            </p>
            <Link
              href={loginUrl}
              className="mt-6 block w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Sign in to accept
            </Link>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={accept}
              disabled={accepting}
              className="mt-6 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {accepting ? 'Accepting…' : 'Accept invitation'}
            </button>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </>
        )}
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-muted-foreground hover:underline">
          Decline and go to dashboard
        </Link>
      </div>
    </div>
  );
}
