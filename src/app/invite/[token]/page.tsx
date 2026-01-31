'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InviteAcceptPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [invite, setInvite] = useState<{ orgName: string; email: string; role: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setInvite(d);
      })
      .catch(() => setError('Failed to load invitation'));
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    try {
      const res = await fetch(`/api/invite/${token}`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        document.cookie = `selected_org_id=; path=/; max-age=0`;
        router.push('/dashboard');
        router.refresh();
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

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="rounded-lg border bg-card p-6 text-center">
        <h1 className="text-xl font-semibold">You&apos;re invited</h1>
        <p className="mt-2 text-muted-foreground">
          Join <strong>{invite.orgName}</strong> as {invite.role}
        </p>
        <button
          type="button"
          onClick={accept}
          disabled={accepting}
          className="mt-6 w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {accepting ? 'Accepting…' : 'Accept invitation'}
        </button>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-muted-foreground hover:underline">
          Decline and go to dashboard
        </Link>
      </div>
    </div>
  );
}
