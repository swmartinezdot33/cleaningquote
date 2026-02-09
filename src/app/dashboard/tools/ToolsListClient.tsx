'use client';

import Link from 'next/link';
import { useDashboardApi } from '@/lib/dashboard-api';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

type ToolRow = { id: string; name: string; slug: string; org_id: string };

/**
 * Tools list for /dashboard/tools. Refetches when locationId from user context changes.
 */
export default function ToolsListClient() {
  const { api, locationId } = useDashboardApi();
  const [tools, setTools] = useState<ToolRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId) {
      setTools([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api('/api/dashboard/tools')
      .then((r) => (r.ok ? r.json() : { tools: [] }))
      .then((data) => setTools(data.tools ?? []))
      .catch(() => setTools([]))
      .finally(() => setLoading(false));
  }, [locationId, api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!locationId) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Tools</h1>
        <p className="text-muted-foreground">Open CleanQuote from your GoHighLevel dashboard to manage tools.</p>
        <Link
          href="/dashboard/setup"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Connect location
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Tools</h1>
      <p className="text-muted-foreground">Quoting tools for this location. Create one to start sending quotes.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            href={`/dashboard/tools/${tool.id}`}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-muted/40 hover:border-primary/40"
          >
            <h2 className="font-semibold text-foreground">{tool.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">/t/{tool.slug}</p>
          </Link>
        ))}
        <Link
          href="/dashboard/tools/new"
          className="flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground hover:border-primary/50"
        >
          + Create quoting tool
        </Link>
      </div>
    </div>
  );
}
