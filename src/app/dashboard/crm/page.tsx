'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Loader2, TrendingUp } from 'lucide-react';
import { useEffectiveLocationId } from '@/lib/ghl-iframe-context';
import { getGHLMarketplaceAppUrl } from '@/lib/ghl/oauth-utils';

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  created_at: string;
}

interface Stats {
  counts: Record<string, number>;
  total: number;
  recentActivities: Array<{
    id: string;
    contact_id: string;
    type: string;
    title: string;
    created_at: string;
  }>;
}

const STAGES = ['lead', 'quoted', 'booked', 'customer', 'churned'] as const;

export default function CRMDashboardPage() {
  const effectiveLocationId = useEffectiveLocationId();
  const [stats, setStats] = useState<Stats | null>(null);
  const [contactsByStage, setContactsByStage] = useState<Record<string, Contact[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);

  const locationSuffix = effectiveLocationId ? `&locationId=${effectiveLocationId}` : '';

  useEffect(() => {
    const statsUrl = effectiveLocationId
      ? `/api/dashboard/crm/stats?locationId=${effectiveLocationId}`
      : '/api/dashboard/crm/stats';
    Promise.all([
      fetch(statsUrl).then((r) => (r.ok ? r.json() : null)),
      ...STAGES.map((stage) =>
        fetch(`/api/dashboard/crm/contacts?stage=${stage}&perPage=20${locationSuffix}`).then((r) =>
          r.ok ? r.json() : { contacts: [] }
        )
      ),
    ])
      .then(([statsRes, ...stageRes]) => {
        setStats(statsRes ?? { counts: {}, total: 0, recentActivities: [] });
        setNeedsConnect(!!(statsRes as { needsConnect?: boolean })?.needsConnect);
        const byStage: Record<string, Contact[]> = {};
        STAGES.forEach((s, i) => {
          byStage[s] = stageRes[i]?.contacts ?? [];
        });
        setContactsByStage(byStage);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [effectiveLocationId, locationSuffix]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        <p>Could not load CRM: {error}</p>
      </div>
    );
  }

  if (needsConnect && effectiveLocationId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">CRM Pipeline</h1>
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-6 text-amber-800 dark:text-amber-200">
          <p className="font-medium">Connect your location</p>
          <p className="mt-2 text-sm">
            This location needs a one-time connection. Click below to authorize CleanQuote to access your CRM data.
          </p>
          <a
            href={getGHLMarketplaceAppUrl()}
            className="mt-4 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Connect via OAuth
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CRM Pipeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track leads from quote to customer
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Total</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{stats?.total ?? 0}</p>
        </div>
        {STAGES.map((stage) => (
          <div key={stage} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground capitalize">{stage}</span>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats?.counts?.[stage] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Kanban */}
      <div className="grid gap-4 lg:grid-cols-5">
        {STAGES.map((stage) => (
          <div
            key={stage}
            className="rounded-xl border border-border bg-muted/30 p-3"
          >
            <h3 className="mb-3 font-semibold capitalize text-foreground">{stage}</h3>
            <div className="space-y-2">
              {(contactsByStage[stage] ?? []).map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/crm/contacts/${c.id}`}
                  className="block rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/40 transition-colors"
                >
                  <p className="font-medium text-foreground truncate">
                    {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Unknown'}
                  </p>
                  {c.email && (
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{c.email}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      {stats?.recentActivities && stats.recentActivities.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Recent Activity</h2>
          <ul className="mt-4 space-y-2">
            {stats.recentActivities.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="capitalize">{a.type.replace('_', ' ')}</span>
                <span>—</span>
                <span>{a.title}</span>
                <Link
                  href={`/dashboard/crm/contacts/${a.contact_id}`}
                  className="text-primary hover:underline"
                >
                  View
                </Link>
                <span className="ml-auto">
                  {new Date(a.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
