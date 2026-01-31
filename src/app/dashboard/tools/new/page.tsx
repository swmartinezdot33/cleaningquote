'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { slugToSafe } from '@/lib/supabase/tools';

export default function NewToolPage() {
  const router = useRouter();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/orgs/selected')
      .then((r) => r.json())
      .then((d) => setOrgId(d.org?.id ?? null))
      .catch(() => {});
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setName(v);
    if (!slug || slug === slugToSafe(name)) {
      setSlug(slugToSafe(v) || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const safeSlug = slugToSafe(slug || name || 'tool');
      if (!safeSlug) {
        setError('Please enter a name or slug.');
        setLoading(false);
        return;
      }
      if (!orgId) {
        setError('No organization selected. Please refresh and try again.');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/dashboard/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          name: name.trim() || safeSlug,
          slug: safeSlug,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create tool');
        setLoading(false);
        return;
      }
      router.push(`/dashboard/tools/${data.tool.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm font-medium text-primary hover:underline">
          ← Back to tools
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-foreground">Create quoting tool</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Each tool has its own survey, pricing, and GHL settings. The slug is used in the URL (e.g. /t/your-slug).
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. Acme Cleaning"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-foreground">
            Slug (URL-safe)
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. acme-cleaning"
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Public URL: /t/{slugToSafe(slug || name) || '…'}
          </p>
        </div>
        <div>
          <button
            type="submit"
            disabled={loading || !orgId}
            className="w-full flex justify-center rounded-md bg-primary py-2 px-4 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create quoting tool'}
          </button>
        </div>
      </form>
    </div>
  );
}
