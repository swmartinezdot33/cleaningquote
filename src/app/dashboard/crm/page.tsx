'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Users, Loader2, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react';
import { useEffectiveLocationId } from '@/lib/ghl-iframe-context';
import { useDashboardApi } from '@/lib/dashboard-api';
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

interface VerifyResult {
  ok: boolean;
  hasToken?: boolean;
  hasLocationId?: boolean;
  ghlCallOk?: boolean;
  reason?: string;
  message?: string;
  locationId?: string;
  companyName?: string;
  contactsSample?: number;
  /** Proof from KV: do we have an installation record for the looked-up locationId? */
  tokenExistsInKV?: boolean;
  locationIdLookedUp?: string;
}

const STAGES = ['lead', 'quoted', 'booked', 'customer', 'churned'] as const;

export default function CRMDashboardPage() {
  const effectiveLocationId = useEffectiveLocationId();
  const { api } = useDashboardApi();
  const [stats, setStats] = useState<Stats | null>(null);
  const [contactsByStage, setContactsByStage] = useState<Record<string, Contact[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const statusRef = useRef<HTMLParagraphElement | null>(null);

  const runVerify = useCallback(async () => {
    setTestingConnection(true);
    try {
      const r = await api('/api/dashboard/ghl/verify');
      const data = await r.json();
      setVerify(data);
      requestAnimationFrame(() => statusRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    } catch (e) {
      setVerify({ ok: false, message: e instanceof Error ? e.message : 'Verify request failed' });
    } finally {
      setTestingConnection(false);
    }
  }, [api]);

  useEffect(() => {
    if (!effectiveLocationId) {
      fetch('/api/dashboard/ghl/verify', { credentials: 'include' })
        .then((res) => res.json())
        .then(setVerify)
        .catch(() => setVerify({ ok: false, message: 'No location ID' }))
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      api('/api/dashboard/crm/stats').then((r) => (r.ok ? r.json() : null)),
      api('/api/dashboard/ghl/verify').then((res) => res.json()),
      ...STAGES.map((stage) =>
        api(`/api/dashboard/crm/contacts?stage=${stage}&perPage=20`).then((r) =>
          r.ok ? r.json() : { contacts: [] }
        )
      ),
    ])
      .then(([statsRes, verifyRes, ...stageRes]) => {
        setStats(statsRes ?? { counts: {}, total: 0, recentActivities: [] });
        setVerify(verifyRes);
        setNeedsConnect(!!(statsRes as { needsConnect?: boolean })?.needsConnect);
        const byStage: Record<string, Contact[]> = {};
        STAGES.forEach((s, i) => {
          byStage[s] = stageRes[i]?.contacts ?? [];
        });
        setContactsByStage(byStage);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [effectiveLocationId, api]);

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

  const connectionOk = verify?.ok === true;
  const showConnectCTA = (needsConnect || !connectionOk) && effectiveLocationId;
  const noLocation = !effectiveLocationId && !loading;

  if (noLocation) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">CRM Pipeline</h1>
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-6 text-amber-800 dark:text-amber-200">
          <p className="font-medium">No location context</p>
          <p className="mt-2 text-sm">
            Open CleanQuote from your GoHighLevel dashboard (sub-account) or complete OAuth so we have your location and can call the GHL API.
          </p>
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            User context: Location ID = None (not received from iframe/session)
          </p>
          {verify && !verify.ok && (
            <div ref={statusRef} className="mt-3 rounded border border-amber-600/50 bg-amber-500/10 px-3 py-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                {testingConnection ? 'Testing…' : (effectiveLocationId ? 'Not connected' : 'No location')}
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">{verify.message ?? ''}</p>
            </div>
          )}
          <button
            type="button"
            onClick={runVerify}
            disabled={testingConnection}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-amber-600 px-4 py-2 text-sm font-medium hover:bg-amber-500/20 disabled:opacity-50"
          >
            {testingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Test connection
          </button>
        </div>
      </div>
    );
  }

  if (showConnectCTA) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">CRM Pipeline</h1>
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-6 text-amber-800 dark:text-amber-200">
          <p className="font-medium">Connect your location</p>
          <p className="mt-2 text-sm">
            This location needs a one-time connection. Click below to authorize CleanQuote to access your CRM data.
          </p>
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">
            User context: Location ID = {effectiveLocationId ? `${effectiveLocationId.slice(0, 8)}..${effectiveLocationId.slice(-4)}` : 'None (not received)'}
          </p>
          {verify && (
            <div ref={statusRef} className="mt-3 rounded border border-amber-600/50 bg-amber-500/10 px-3 py-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                {testingConnection ? 'Testing…' : 'Not connected'}
              </p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
                {verify.message ?? ''}
              </p>
              {(verify.tokenExistsInKV !== undefined || verify.locationIdLookedUp) && (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  KV lookup: {verify.locationIdLookedUp ?? '—'} → token in KV: {verify.tokenExistsInKV === true ? 'Yes' : verify.tokenExistsInKV === false ? 'No' : '—'}
                </p>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              href={getGHLMarketplaceAppUrl()}
              className="inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Connect via OAuth
            </a>
            <button
              type="button"
              onClick={runVerify}
              disabled={testingConnection || !effectiveLocationId}
              className="inline-flex items-center gap-2 rounded-md border border-amber-600 bg-transparent px-4 py-2 text-sm font-medium text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
            >
              {testingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Test connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Connection status: we have locationId + token and GHL API works */}
      {verify?.ok && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-200">
          <span className="inline-flex items-center gap-2 font-medium">
            <CheckCircle className="h-5 w-5" />
            {verify.companyName ? (
              <>Connected: {verify.companyName} — location and token verified, GHL API OK</>
            ) : (
              <>Connected: location and token verified, GHL API OK</>
            )}
          </span>
          <button
            type="button"
            onClick={runVerify}
            disabled={testingConnection}
            className="inline-flex items-center gap-1.5 rounded border border-green-600/50 px-2.5 py-1 text-xs hover:bg-green-500/20 disabled:opacity-50"
          >
            {testingConnection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Test again
          </button>
        </div>
      )}

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
