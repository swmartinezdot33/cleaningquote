'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
} from '@dnd-kit/core';
import { Users, Loader2, TrendingUp, RefreshCw, GripVertical, ExternalLink, DollarSign } from 'lucide-react';
import { useEffectiveLocationId } from '@/lib/ghl-iframe-context';
import { useDashboardApi } from '@/lib/dashboard-api';
import { getInstallUrlWithLocation } from '@/lib/ghl/oauth-utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

/** Draggable opportunity card for Kanban */
function DraggableOpportunityCard({
  opportunity,
  onOpenModal,
}: {
  opportunity: Opportunity;
  onOpenModal: (o: Opportunity) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: opportunity.id,
    data: { opportunity, stageId: opportunity.pipelineStageId },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpenModal(opportunity)}
      className={`flex items-start gap-2 rounded-lg border border-border bg-card p-3 shadow-sm transition-colors cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md ${isDragging ? 'opacity-80 shadow-lg ring-2 ring-primary/30' : ''}`}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground truncate">{opportunity.name || 'Opportunity'}</p>
        {opportunity.value != null && (
          <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {Number(opportunity.value).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}

/** Droppable column for a pipeline stage */
function DroppableStageColumn({
  stage,
  opportunities,
  onOpenModal,
}: {
  stage: { id: string; name: string };
  opportunities: Opportunity[];
  onOpenModal: (o: Opportunity) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: stage.id,
    data: { stageId: stage.id },
  });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border min-h-[120px] p-3 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
      }`}
    >
      <h4 className="mb-3 font-semibold text-foreground truncate flex items-center gap-2" title={stage.name}>
        {stage.name}
        <span className="text-xs font-normal text-muted-foreground">({opportunities.length})</span>
      </h4>
      <div className="space-y-2 min-h-[60px]">
        {opportunities.length > 0 ? (
          opportunities.map((o) => (
            <DraggableOpportunityCard key={o.id} opportunity={o} onOpenModal={onOpenModal} />
          ))
        ) : (
          <p className="text-xs text-muted-foreground/70 py-2">Drop here</p>
        )}
      </div>
    </div>
  );
}

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
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? sessionStorage.getItem('crm_selected_pipeline_id') : null
  );
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loadingOpportunities, setLoadingOpportunities] = useState(false);
  const [modalOpportunity, setModalOpportunity] = useState<Opportunity | null>(null);
  const [editName, setEditName] = useState('');
  const [editValue, setEditValue] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('open');
  const [editStageId, setEditStageId] = useState<string>('');
  const [savingOpportunity, setSavingOpportunity] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const dragJustEndedRef = useRef(false);

  // Sync form when modal opens
  useEffect(() => {
    if (modalOpportunity) {
      setEditName(modalOpportunity.name ?? '');
      setEditValue(modalOpportunity.value != null ? String(modalOpportunity.value) : '');
      setEditStatus(modalOpportunity.status ?? 'open');
      setEditStageId(modalOpportunity.pipelineStageId ?? '');
      setSaveError(null);
    }
  }, [modalOpportunity]);

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
        const pipelineList = pipelinesData?.pipelines ?? [];
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/crm/page.tsx:Promise.then', message: 'pipelines response on client', data: { pipelinesDataKeys: pipelinesData ? Object.keys(pipelinesData) : [], pipelineListLength: pipelineList?.length ?? 0, needsConnect: pipelinesData?.needsConnect }, timestamp: Date.now(), hypothesisId: 'H4' }) }).catch(() => {});
        // #endregion
        setStats(statsRes ?? { counts: {}, total: 0, recentActivities: [] });
        setVerify(verifyRes);
        setPipelines(pipelineList);
        // Use verify as source of truth: if verify says ok, we're connected. Don't trust needsConnect from
        // stats/pipelines when returning to the page (avoids race where one request returns needsConnect before token is ready).
        setNeedsConnect(verifyRes?.ok === true ? false : !!(statsData?.needsConnect ?? pipelinesData?.needsConnect));
        const stored = typeof window !== 'undefined' ? sessionStorage.getItem('crm_selected_pipeline_id') : null;
        const validStored = pipelineList.find((p) => p.id === stored)?.id ?? null;
        const nextId = validStored || (pipelineList[0]?.id ?? null);
        setSelectedPipelineId(nextId);
        if (typeof window !== 'undefined' && nextId) sessionStorage.setItem('crm_selected_pipeline_id', nextId);
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

  const refetchOpportunities = useCallback(() => {
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

  const handleDragStart = useCallback(() => {
    dragJustEndedRef.current = false;
  }, []);
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      dragJustEndedRef.current = true;
      setTimeout(() => {
        dragJustEndedRef.current = false;
      }, 150);
      if (!over || active.id === over.id) {
        setMovingId(null);
        return;
      }
      const opportunityId = String(active.id);
      const stages = pipelines.find((p) => p.id === selectedPipelineId)?.stages ?? [];
      const stageIds = new Set(stages.map((s) => s.id));
      const overId = over.id != null ? String(over.id) : '';
      const overStageId = (over.data?.current as { stageId?: string } | undefined)?.stageId;
      let newStageId: string | null = null;
      if (stageIds.has(overId)) {
        newStageId = overId;
      } else if (overStageId && stageIds.has(overStageId)) {
        newStageId = overStageId;
      } else {
        const droppedOnOpp = opportunities.find((o) => o.id === overId);
        newStageId = droppedOnOpp?.pipelineStageId ?? null;
      }
      const opp = opportunities.find((o) => o.id === opportunityId);
      if (!opp || !newStageId || opp.pipelineStageId === newStageId) {
        setMovingId(null);
        return;
      }
      setMovingId(opportunityId);
      api(`/api/dashboard/crm/opportunities/${encodeURIComponent(opportunityId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineStageId: newStageId }),
      })
        .then((r) => {
          if (r.ok) {
            setOpportunities((prev) =>
              prev.map((o) =>
                o.id === opportunityId ? { ...o, pipelineStageId: newStageId } : o
              )
            );
          } else {
            refetchOpportunities();
          }
        })
        .catch(() => refetchOpportunities())
        .finally(() => setMovingId(null));
    },
    [opportunities, pipelines, selectedPipelineId, api, refetchOpportunities]
  );
  const openModalIfNotDrag = useCallback((o: Opportunity) => {
    if (dragJustEndedRef.current) return;
    setModalOpportunity(o);
  }, []);

  const saveOpportunityEdits = useCallback(async () => {
    if (!modalOpportunity || !api) return;
    setSavingOpportunity(true);
    setSaveError(null);
    try {
      const payload: { name?: string; monetaryValue?: number; status?: string; pipelineStageId?: string } = {};
      if (editName.trim() !== modalOpportunity.name) payload.name = editName.trim();
      const numVal = editValue.trim() === '' ? undefined : Number(editValue);
      if (numVal !== undefined && numVal !== modalOpportunity.value) payload.monetaryValue = numVal;
      if (editStatus !== modalOpportunity.status) payload.status = editStatus;
      if (editStageId && editStageId !== modalOpportunity.pipelineStageId) payload.pipelineStageId = editStageId;
      if (Object.keys(payload).length === 0) {
        setSavingOpportunity(false);
        return;
      }
      const r = await api(`/api/dashboard/crm/opportunities/${encodeURIComponent(modalOpportunity.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setSaveError(data?.error ?? 'Failed to update opportunity');
        return;
      }
      const updated = data?.opportunity;
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === modalOpportunity.id
            ? {
                ...o,
                name: updated?.name ?? editName.trim(),
                value: updated?.monetaryValue ?? updated?.value ?? (numVal ?? o.value),
                status: updated?.status ?? editStatus,
                pipelineStageId: updated?.pipelineStageId ?? (editStageId || o.pipelineStageId),
              }
            : o
        )
      );
      setModalOpportunity((prev) =>
        prev
          ? {
              ...prev,
              name: updated?.name ?? editName.trim(),
              value: updated?.monetaryValue ?? updated?.value ?? numVal ?? prev.value,
              status: updated?.status ?? editStatus,
              pipelineStageId: updated?.pipelineStageId ?? (editStageId || prev.pipelineStageId),
            }
          : null
      );
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSavingOpportunity(false);
    }
  }, [modalOpportunity, api, editName, editValue, editStatus, editStageId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

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
  // Only show Connect when verify says not connected (!connectionOk). If verify says ok, we're connected — same as other pages.
  const needsConnectBanner =
    !connectionOk && effectiveLocationId && !apiError && !hasData;

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
        {pipelines.length > 0 ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="pipeline-select" className="text-sm font-medium text-foreground">
                Pipeline
              </label>
              <select
                id="pipeline-select"
                value={selectedPipelineId ?? ''}
                onChange={(e) => {
                  const v = e.target.value || null;
                  setSelectedPipelineId(v);
                  if (typeof window !== 'undefined') sessionStorage.setItem('crm_selected_pipeline_id', v ?? '');
                }}
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
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <h3 className="font-medium text-foreground">{selectedPipeline?.name ?? 'Pipeline'}</h3>
                    {loadingOpportunities && (
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Updating…
                      </span>
                    )}
                  </div>
                  {stages.length ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={pointerWithin}
                      onDragEnd={handleDragEnd}
                      onDragStart={handleDragStart}
                    >
                      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        {stages.map((stage) => (
                          <DroppableStageColumn
                            key={stage.id}
                            stage={stage}
                            opportunities={byStage[stage.id] ?? []}
                            onOpenModal={openModalIfNotDrag}
                          />
                        ))}
                      </div>
                    </DndContext>
                  ) : (
                    <p className="text-sm text-muted-foreground">No stages in this pipeline.</p>
                  )}
                </div>
              );
            })()}

            {selectedPipelineId && !loadingOpportunities && opportunities.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground">
                No open opportunities in this pipeline. Create opportunities in GoHighLevel to see them here.
              </p>
            )}
          </>
        ) : needsConnect && !connectionOk ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <span className="font-medium">Connect this location to load pipelines and opportunities.</span>
            <a
              href={getConnectInstallUrl(effectiveLocationId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
            >
              Connect via OAuth
            </a>
          </div>
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

      {/* Opportunity detail modal – view and edit GHL opportunity data */}
      <Dialog open={!!modalOpportunity} onOpenChange={(open) => !open && setModalOpportunity(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Opportunity</DialogTitle>
            <DialogDescription>
              View and edit opportunity data from GoHighLevel. Changes are saved to GHL.
            </DialogDescription>
          </DialogHeader>
          {modalOpportunity && (
            <form
              className="space-y-4 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveOpportunityEdits();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="opp-name">Name</Label>
                <Input
                  id="opp-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Opportunity name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="opp-value">Value ($)</Label>
                <Input
                  id="opp-value"
                  type="number"
                  min={0}
                  step={1}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(() => {
                const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
                const stages = selectedPipeline?.stages ?? [];
                if (stages.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select value={editStageId || undefined} onValueChange={(v) => setEditStageId(v || '')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}
              {saveError && (
                <p className="text-sm text-destructive">{saveError}</p>
              )}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="submit"
                  disabled={savingOpportunity}
                >
                  {savingOpportunity ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
                <Link
                  href={`/dashboard/crm/contacts/${modalOpportunity.contactId}`}
                  className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                  View contact
                </Link>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
