'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Users, Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import { useEffectiveLocationId } from '@/lib/ghl-iframe-context';
import { useDashboardApi } from '@/lib/dashboard-api';
import { getInstallUrlWithLocation } from '@/lib/ghl/oauth-utils';

/** Install URL (opens in new tab): sets cookie then redirects to GHL install so callback gets correct locationId. */
function getConnectInstallUrl(locationId: string | null): string {
  if (typeof window === 'undefined') return '#';
  return getInstallUrlWithLocation(window.location.origin, locationId);
}

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

/** GHL pipeline from GET /opportunities/pipelines */
interface GHLPipeline {
  id: string;
  name: string;
  stages: Array<{ id: string; name: string }>;
}

/** Opportunity from GET /opportunities/search */
interface Opportunity {
  id: string;
  contactId: string;
  name: string;
  value?: number;
  status: string;
  pipelineId?: string;
  pipelineStageId?: string;
}

const STAGES = ['lead', 'quoted', 'booked', 'customer', 'churned'] as const;

export default function CRMDashboardPage() {
  const effectiveLocationId = useEffectiveLocationId();
  const { api } = useDashboardApi();
  const [stats, setStats] = useState<Stats | null>(null);
  const [pipelines, setPipelines] = useState<GHLPipeline[]>([]);
  const [contactsByStage, setContactsByStage] = useState<Record<string, Contact[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const statusRef = useRef<HTMLParagraphElement | null>(null);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);

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
    setApiError(null);
    if (!effectiveLocationId) {
      fetch('/api/dashboard/ghl/verify', { credentials: 'include' })
        .then((res) => res.json())
        .then(setVerify)
        .catch(() => setVerify({ ok: false, message: 'No location ID' }))
        .finally(() => setLoading(false));
      return;
    }
    Promise.all([
      api('/api/dashboard/crm/stats').then(async (r) => (r.ok ? r.json() : r.json().catch(() => null))),
      api('/api/dashboard/ghl/verify').then((res) => res.json()),
      api('/api/dashboard/crm/pipelines').then(async (r) => (r.ok ? r.json() : r.json().catch(() => ({ pipelines: [] })))),
      ...STAGES.map((stage) =>
        api(`/api/dashboard/crm/contacts?stage=${stage}&perPage=20`).then((r) =>
          r.ok ? r.json() : { contacts: [] }
        )
      ),
    ])
      .then(([statsRes, verifyRes, pipelinesRes, ...stageRes]) => {
        const statsData = statsRes as { needsConnect?: boolean; apiError?: boolean; error?: string } | null;
        const pipelinesData = pipelinesRes as { pipelines?: GHLPipeline[]; needsConnect?: boolean } | undefined;
        setStats(statsRes ?? { counts: {}, total: 0, recentActivities: [] });
        setVerify(verifyRes);
        const pipelineList = pipelinesData?.pipelines ?? [];
        setPipelines(pipelineList);
        setNeedsConnect(!!(statsData?.needsConnect ?? pipelinesData?.needsConnect));
        setSelectedPipelineId((prev) => prev || (pipelineList[0]?.id ?? null));
        setApiError(statsData?.apiError && statsData?.error ? statsData.error : null);
        const byStage: Record<string, Contact[]> = {};
        STAGES.forEach((s, i) => {
          byStage[s] = stageRes[i]?.contacts ?? [];
        });
        setContactsByStage(byStage);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [effectiveLocationId, api, retryTrigger]);

  // Fetch opportunities for the selected pipeline
  useEffect(() => {
    if (!effectiveLocationId || !selectedPipelineId || !api) return;
    setLoadingOpportunities(true);
    api(`/api/dashboard/crm/opportunities?pipelineId=${encodeURIComponent(selectedPipelineId)}&limit=100`)
      .then((r) => (r.ok ? r.json() : { opportunities: [] }))
      .then((data: { opportunities?: Opportunity[] }) => {
        setOpportunities(Array.isArray(data?.opportunities) ? data.opportunities : []);
      })
      .catch(() => setOpportunities([]))
      .finally(() => setLoadingOpportunities(false));
  }, [effectiveLocationId, selectedPipelineId, api]);

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
  const noLocation = !effectiveLocationId && !loading;
  // Don't show Connect banner when we already have data — e.g. contacts loaded in columns, pipelines, or stats.
  const hasData =
    pipelines.length > 0 ||
    (stats?.total ?? 0) > 0 ||
    STAGES.some((s) => (contactsByStage[s]?.length ?? 0) > 0);
  const needsConnectBanner =
    (needsConnect || !connectionOk) && effectiveLocationId && !apiError && !hasData;

  if (apiError && effectiveLocationId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
          <p className="font-medium">API call failed</p>
          <p className="mt-2 text-sm">{apiError}</p>
          <p className="mt-3 text-xs opacity-90">
            Location is connected via OAuth; the request to GHL failed. Check the error above (e.g. invalid parameters or rate limits).
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => { setLoading(true); setRetryTrigger((t) => t + 1); }}
              className="inline-flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/10"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
            <button
              type="button"
              onClick={runVerify}
              disabled={testingConnection}
              className="inline-flex items-center gap-2 rounded-md border border-muted-foreground/30 px-4 py-2 text-sm font-medium hover:bg-muted/50 disabled:opacity-50"
            >
              {testingConnection ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Test connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (noLocation) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
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

  return (
    <div className="space-y-8">
      {/* Connect banner when we have locationId but no token — same pattern as contacts; don't block pipeline UI */}
      {needsConnectBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <span className="font-medium">Connect this location to load CRM data and opportunities.</span>
          <div className="flex items-center gap-2">
            <a
              href={getConnectInstallUrl(effectiveLocationId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
            >
              Connect via OAuth
            </a>
            <button
              type="button"
              onClick={runVerify}
              disabled={testingConnection}
              className="inline-flex items-center gap-1.5 rounded border border-amber-600/50 px-2.5 py-1 text-xs hover:bg-amber-500/20 disabled:opacity-50"
            >
              {testingConnection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Test connection
            </button>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track leads from quote to customer
        </p>
      </div>

      {/* Pipeline selector + GHL opportunities Kanban */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-lg font-semibold text-foreground">Your GHL leads</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Opportunity leads for this location (from GoHighLevel). Select a pipeline to view opportunities by stage.
        </p>
        {pipelines.length > 0 ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="pipeline-select" className="text-sm font-medium text-foreground">
                Pipeline
              </label>
              <select
                id="pipeline-select"
                value={selectedPipelineId ?? ''}
                onChange={(e) => setSelectedPipelineId(e.target.value || null)}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[200px]"
              >
                <option value="">Select a pipeline</option>
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selectedPipelineId && (
                <span className="text-sm text-muted-foreground">
                  {loadingOpportunities ? (
                    <span className="inline-flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Loading…
                    </span>
                  ) : (
                    <span>{opportunities.length} opportunity{opportunities.length !== 1 ? 'ies' : ''}</span>
                  )}
                </span>
              )}
            </div>

            {selectedPipelineId && (() => {
              const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
              const stages = selectedPipeline?.stages ?? [];
              const byStage: Record<string, Opportunity[]> = {};
              stages.forEach((s) => {
                byStage[s.id] = opportunities.filter((o) => o.pipelineStageId === s.id);
              });
              return (
                <div className="mt-6">
                  <h3 className="mb-3 font-medium text-foreground">{selectedPipeline?.name ?? 'Pipeline'}</h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    {stages.length ? (
                      stages.map((stage) => (
                        <div
                          key={stage.id}
                          className="rounded-xl border border-border bg-muted/30 p-3"
                        >
                          <h4 className="mb-3 font-semibold text-foreground truncate" title={stage.name}>
                            {stage.name}
                          </h4>
                          <div className="space-y-2">
                            {(byStage[stage.id] ?? []).map((o) => (
                              <Link
                                key={o.id}
                                href={`/dashboard/crm/contacts/${o.contactId}`}
                                className="block rounded-lg border border-border bg-card p-3 shadow-sm hover:border-primary/40 transition-colors"
                              >
                                <p className="font-medium text-foreground truncate">{o.name || 'Opportunity'}</p>
                                {o.value != null && (
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    ${Number(o.value).toLocaleString()}
                                  </p>
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No stages in this pipeline.</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {selectedPipelineId && !loadingOpportunities && opportunities.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                No open opportunities in this pipeline. Create opportunities in GoHighLevel to see them here.
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No pipelines found for this location.</p>
        )}
      </div>

      {/* Quick stats (contact overview) */}
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
