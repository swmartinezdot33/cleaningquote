'use client';

import Link from 'next/link';
import { useDashboardApi } from '@/lib/dashboard-api';
import { useEffect, useState } from 'react';
import { Loader2, Wrench, Users, FileText, MapPin, DollarSign, ArrowRight } from 'lucide-react';

interface CrmStats {
  counts: Record<string, number>;
  total: number;
}

/**
 * Dashboard home: analytics cards and quick links. Shown when landing on /dashboard.
 */
export default function DashboardHomeClient() {
  const { api, locationId } = useDashboardApi();
  const [toolsCount, setToolsCount] = useState<number | null>(null);
  const [crmStats, setCrmStats] = useState<CrmStats | null>(null);
  const [quotesCount, setQuotesCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api('/api/dashboard/tools').then((r) => (r.ok ? r.json() : { tools: [] })),
      api('/api/dashboard/crm/stats').then((r) => (r.ok ? r.json() : { counts: {}, total: 0 })),
      api('/api/dashboard/quotes').then((r) => (r.ok ? r.json() : { quotes: [] })),
    ])
      .then(([toolsRes, statsRes, quotesRes]) => {
        setToolsCount((toolsRes.tools ?? []).length);
        setCrmStats({ counts: statsRes.counts ?? {}, total: statsRes.total ?? 0 });
        setQuotesCount((quotesRes.quotes ?? []).length);
      })
      .catch(() => {
        setToolsCount(0);
        setCrmStats({ counts: {}, total: 0 });
        setQuotesCount(0);
      })
      .finally(() => setLoading(false));
  }, [locationId, api]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No location context — show CTA to open from GHL
  if (!locationId) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Reconnect to load your CRM data.</p>
        <Link
          href="/dashboard/setup"
          className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Connect location
        </Link>
      </div>
    );
  }

  const cards = [
    {
      title: 'Quoting tools',
      value: toolsCount ?? 0,
      href: '/dashboard/tools',
      icon: Wrench,
      description: 'Active quoting tools',
    },
    {
      title: 'Contacts',
      value: crmStats?.total ?? 0,
      href: '/dashboard/crm/contacts',
      icon: Users,
      description: 'In your CRM',
    },
    {
      title: 'Quotes',
      value: quotesCount ?? 0,
      href: '/dashboard/quotes',
      icon: FileText,
      description: 'Quote records',
    },
    {
      title: 'Service areas',
      value: '—',
      href: '/dashboard/service-areas',
      icon: MapPin,
      description: 'Manage coverage',
    },
    {
      title: 'Pricing',
      value: '—',
      href: '/dashboard/pricing-structures',
      icon: DollarSign,
      description: 'Pricing structures',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of your location. Use the menu above to dive into tools, leads, and more.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-muted/60 p-2">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-semibold text-foreground">{card.value}</p>
                <p className="font-medium text-foreground">{card.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{card.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
