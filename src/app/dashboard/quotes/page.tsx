'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ExternalLink, RefreshCw, ArrowRightLeft, Search, Filter, Trash2, Copy, Check, ChevronLeft, ChevronRight, User, Plus } from 'lucide-react';
import { useDashboardApi } from '@/lib/dashboard-api';
import { useDashboardPageState } from '@/lib/dashboard-page-state';
import { AddressMapLinks } from '@/components/AddressMapLinks';
import { ServiceAreaMapViewModal } from '@/components/ServiceAreaMapViewModal';
import { LoadingDots } from '@/components/ui/loading-dots';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface QuoteRow {
  id: string;
  quote_id: string;
  tool_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  service_type: string | null;
  frequency: string | null;
  price_low: number | null;
  price_high: number | null;
  price_initial_low?: number | null;
  price_initial_high?: number | null;
  price_recurring_low?: number | null;
  price_recurring_high?: number | null;
  square_feet: string | null;
  bedrooms: number | null;
  created_at: string;
  toolName: string;
  toolSlug: string | null;
  status?: string | null;
  disqualifiedOptionLabel?: string | null;
  contactId?: string | null;
  /** Resolved from GHL contact when contactId is set */
  contactName?: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(low: number | null, high: number | null) {
  if (low == null && high == null) return '—';
  if (low != null && high != null) return `$${low}–$${high}`;
  if (low != null) return `$${low}+`;
  if (high != null) return `Up to $${high}`;
  return '—';
}

function quoteAddressLine(q: QuoteRow): string {
  return [q.address, q.city, q.state, q.postal_code].filter(Boolean).join(', ') || '';
}

type DateRangeKey = 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year';

const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
];

function getDateRangeBounds(key: DateRangeKey): { start: number; end: number } | null {
  if (key === 'all') return null;
  const now = new Date();
  const toMs = (d: Date) => d.getTime();

  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const startOfWeek = (d: Date) => {
    const x = startOfDay(d);
    const day = x.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    x.setDate(x.getDate() + diff);
    return x;
  };
  const endOfWeek = (d: Date) => {
    const x = startOfWeek(d);
    x.setDate(x.getDate() + 7);
    return toMs(x) - 1;
  };
  const startOfMonth = (d: Date) => {
    const x = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
    return x;
  };
  const endOfMonth = (d: Date) => {
    const x = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    return x;
  };
  const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);

  switch (key) {
    case 'this_week': {
      const start = startOfWeek(now);
      const end = endOfWeek(now);
      return { start: toMs(start), end };
    }
    case 'last_week': {
      const thisWeekStart = startOfWeek(now);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      return { start: toMs(lastWeekStart), end: toMs(thisWeekStart) - 1 };
    }
    case 'this_month':
      return { start: toMs(startOfMonth(now)), end: toMs(endOfMonth(now)) };
    case 'last_month': {
      const last = new Date(now.getFullYear(), now.getMonth() - 1);
      return { start: toMs(startOfMonth(last)), end: toMs(endOfMonth(last)) };
    }
    case 'this_year': {
      const start = startOfYear(now);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start: toMs(start), end: toMs(end) };
    }
    default:
      return null;
  }
}

function formatPriceCell(q: QuoteRow) {
  const hasInitial = q.price_initial_low != null && q.price_initial_high != null;
  const hasRecurring = q.price_recurring_low != null && q.price_recurring_high != null;
  if (hasInitial && hasRecurring) {
    return (
      <span className="whitespace-nowrap">
        Initial: {formatPrice(q.price_initial_low ?? null, q.price_initial_high ?? null)}; Recurring: {formatPrice(q.price_recurring_low ?? null, q.price_recurring_high ?? null)}
      </span>
    );
  }
  return formatPrice(q.price_low, q.price_high);
}

interface ToolOption {
  id: string;
  name: string;
  slug: string;
  org_id: string;
  org_name: string;
}

export default function DashboardQuotesPage() {
  const { api, locationId: effectiveLocationId } = useDashboardApi();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedLocationIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [reassignQuote, setReassignQuote] = useState<QuoteRow | null>(null);
  const [deleteQuote, setDeleteQuote] = useState<QuoteRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toolsForReassign, setToolsForReassign] = useState<ToolOption[]>([]);
  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [reassigning, setReassigning] = useState(false);
  const [reassignMessage, setReassignMessage] = useState<string | null>(null);
  // Filters (client-side, persisted per session)
  const [filterToolId, setFilterToolId] = useDashboardPageState<string>('quotes', 'filterToolId', '', {
    locationId: effectiveLocationId ?? undefined,
  });
  const [filterServiceType, setFilterServiceType] = useDashboardPageState<string>('quotes', 'filterServiceType', '', {
    locationId: effectiveLocationId ?? undefined,
  });
  const [filterSearch, setFilterSearch] = useDashboardPageState<string>('quotes', 'filterSearch', '', {
    locationId: effectiveLocationId ?? undefined,
  });
  const [filterDateRange, setFilterDateRange] = useDashboardPageState<DateRangeKey>('quotes', 'filterDateRange', 'all', {
    locationId: effectiveLocationId ?? undefined,
  });
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  // Bulk selection and actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [bulkReassignMessage, setBulkReassignMessage] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [serviceAreaMapAddress, setServiceAreaMapAddress] = useState<string | null>(null);
  // New Quote modal (opens default quoter form in iframe)
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [newQuoteUrl, setNewQuoteUrl] = useState<string | null>(null);
  const [newQuoteError, setNewQuoteError] = useState<string | null>(null);
  const [newQuoteLoading, setNewQuoteLoading] = useState(false);
  // View quote summary in modal (no new tab)
  const [viewQuoteModal, setViewQuoteModal] = useState<QuoteRow | null>(null);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const MAX_QUOTES_RETRIES = 3;
  const RETRY_DELAYS_MS = [1000, 2000, 4000];

  const loadQuotes = useCallback((attempt = 0) => {
    setError(null);
    if (!effectiveLocationId) {
      setLoading(false);
      setQuotes([]);
      return;
    }
    setLoading(true);
    Promise.all([
      api('/api/dashboard/quotes'),
      fetch('/api/dashboard/super-admin/tools'),
    ])
      .then(async ([quotesRes, toolsRes]) => {
        if (quotesRes.ok) {
          const data = await quotesRes.json().catch(() => ({})) as { quotes?: QuoteRow[]; isSuperAdmin?: boolean; isOrgAdmin?: boolean; error?: string };
          return {
            quotes: data.quotes ?? [],
            isSuperAdminFromQuotes: !!data.isSuperAdmin,
            isOrgAdminFromQuotes: !!data.isOrgAdmin,
            toolsOk: toolsRes.ok,
            apiError: data.error,
          };
        }
        const errText = await quotesRes.text();
        let errMessage = `Failed to load quotes (${quotesRes.status})`;
        try {
          const parsed = JSON.parse(errText) as { error?: string };
          if (parsed?.error && typeof parsed.error === 'string') errMessage = parsed.error;
        } catch {
          if (quotesRes.status >= 500) errMessage = 'Server error. Please try again in a moment.';
          else if (quotesRes.status === 401 || quotesRes.status === 403) errMessage = 'Session expired or access denied. Please reopen CleanQuote from GoHighLevel.';
        }
        throw new Error(errMessage);
      })
      .then(({ quotes: list, isSuperAdminFromQuotes, isOrgAdminFromQuotes, toolsOk, apiError }) => {
        setQuotes(list);
        setIsSuperAdmin(!!isSuperAdminFromQuotes || !!toolsOk);
        setIsOrgAdmin(!!isOrgAdminFromQuotes);
        if (apiError) setError(apiError);
        lastFetchedLocationIdRef.current = effectiveLocationId;
        setLoading(false);
      })
      .catch((e) => {
        const msg = e?.message ?? '';
        const isRetryable = msg.includes('Server error') || msg.includes('Failed to load') || msg.includes('502') || msg.includes('500') || msg.includes('fetch') || e?.name === 'TypeError';
        if (isRetryable && attempt < MAX_QUOTES_RETRIES) {
          const delayMs = RETRY_DELAYS_MS[attempt] ?? 4000;
          setTimeout(() => loadQuotes(attempt + 1), delayMs);
          return;
        }
        setError(e?.message ?? 'Failed to load quotes');
        setLoading(false);
      });
  }, [effectiveLocationId, api]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  // Safety net: when locationId appears after we already ran with null (same pattern as DashboardHomeClient), fetch now
  useEffect(() => {
    if (!effectiveLocationId || !api) return;
    if (lastFetchedLocationIdRef.current === effectiveLocationId) return;
    loadQuotes();
  }, [effectiveLocationId, api, loadQuotes]);

  const openReassign = (q: QuoteRow) => {
    setReassignQuote(q);
    setSelectedToolId(q.tool_id ?? '');
    setReassignMessage(null);
    fetch('/api/dashboard/super-admin/tools')
      .then((r) => (r.ok ? r.json() : { tools: [] }))
      .then((d) => setToolsForReassign(d.tools ?? []));
  };

  const submitReassign = async () => {
    if (!reassignQuote) return;
    setReassigning(true);
    setReassignMessage(null);
    try {
      const res = await fetch(`/api/dashboard/super-admin/quotes/${reassignQuote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: selectedToolId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setReassignQuote(null);
        loadQuotes();
      } else {
        setReassignMessage(data.error ?? 'Failed to reassign');
      }
    } finally {
      setReassigning(false);
    }
  };

  const canDelete = isSuperAdmin || isOrgAdmin;

  const copyQuoteLink = (q: QuoteRow) => {
    const url = `${baseUrl}/quote/${q.quote_id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedQuoteId(q.quote_id);
      setTimeout(() => setCopiedQuoteId(null), 2000);
    });
  };

  const confirmDeleteQuote = async () => {
    if (!deleteQuote) return;
    setDeleting(true);
    try {
      const res = await api(`/api/dashboard/quotes/${deleteQuote.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setDeleteQuote(null);
        loadQuotes();
      } else {
        setError(data.error ?? 'Failed to delete quote');
      }
    } finally {
      setDeleting(false);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setBulkDeleting(true);
    setBulkReassignMessage(null);
    try {
      const res = await api('/api/dashboard/quotes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkDeleteOpen(false);
        setSelectedIds(new Set());
        loadQuotes();
      } else {
        setBulkReassignMessage(data.error ?? 'Failed to delete');
      }
    } finally {
      setBulkDeleting(false);
    }
  };

  const submitBulkReassign = async () => {
    if (selectedIds.size === 0) return;
    setBulkReassigning(true);
    setBulkReassignMessage(null);
    try {
      const res = await api('/api/dashboard/quotes/bulk-reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), tool_id: selectedToolId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkReassignOpen(false);
        setSelectedIds(new Set());
        loadQuotes();
      } else {
        setBulkReassignMessage(data.error ?? 'Failed to reassign');
      }
    } finally {
      setBulkReassigning(false);
    }
  };

  const openBulkReassign = () => {
    setBulkReassignOpen(true);
    setBulkReassignMessage(null);
    setSelectedToolId('');
    fetch('/api/dashboard/super-admin/tools')
      .then((r) => (r.ok ? r.json() : { tools: [] }))
      .then((d) => setToolsForReassign(d.tools ?? []));
  };

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Unique tool names and service types for filter dropdowns
  const toolOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];
    quotes.forEach((q) => {
      if (q.tool_id && q.toolName && !seen.has(q.tool_id)) {
        seen.add(q.tool_id);
        list.push({ id: q.tool_id, name: q.toolName });
      }
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [quotes]);

  const serviceTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    quotes.forEach((q) => {
      const v = (q.service_type || '').trim();
      if (v && !seen.has(v)) seen.add(v);
    });
    return Array.from(seen).sort();
  }, [quotes]);

  const filteredQuotes = useMemo(() => {
    const dateBounds = getDateRangeBounds(filterDateRange);
    return quotes.filter((q) => {
      if (filterToolId && q.tool_id !== filterToolId) return false;
      if (filterServiceType && (q.service_type || '').trim() !== filterServiceType) return false;
      if (filterSearch.trim()) {
        const term = filterSearch.trim().toLowerCase();
        const searchable = [
          q.quote_id,
          q.first_name,
          q.last_name,
          q.email,
          q.phone,
          q.address,
          q.city,
          q.state,
          q.postal_code,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!searchable.includes(term)) return false;
      }
      if (dateBounds) {
        const t = new Date(q.created_at).getTime();
        if (t < dateBounds.start || t > dateBounds.end) return false;
      }
      return true;
    });
  }, [quotes, filterToolId, filterServiceType, filterSearch, filterDateRange]);

  const selectedQuotes = useMemo(
    () => filteredQuotes.filter((q) => selectedIds.has(q.id)),
    [filteredQuotes, selectedIds]
  );

  const totalPages = Math.ceil(filteredQuotes.length / perPage);
  const paginatedQuotes = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredQuotes.slice(start, start + perPage);
  }, [filteredQuotes, currentPage, perPage]);

  const toggleSelectAll = useCallback(() => {
    const pageIds = paginatedQuotes.map((q) => q.id);
    const allPageSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [paginatedQuotes, selectedIds]);

  const openNewQuoteModal = useCallback(async () => {
    setNewQuoteOpen(true);
    setNewQuoteError(null);
    setNewQuoteUrl(null);
    setNewQuoteLoading(true);
    try {
      const res = await api('/api/dashboard/default-quoter');
      const data = await res.json().catch(() => ({}));
      const quoter = data.defaultQuoter;
      if (quoter?.newQuotePath) {
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        setNewQuoteUrl(base + quoter.newQuotePath);
      } else {
        setNewQuoteError('No default quoter set. Go to Dashboard → Tools → choose a tool → Settings, then check "Use as default quoter."');
      }
    } catch {
      setNewQuoteError('Could not load default quoter.');
    } finally {
      setNewQuoteLoading(false);
    }
  }, [api]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterToolId, filterServiceType, filterSearch, filterDateRange]);

  // Update select-all checkbox indeterminate state
  useEffect(() => {
    const el = selectAllRef.current;
    if (el && paginatedQuotes.length > 0) {
      const pageIds = paginatedQuotes.map((q) => q.id);
      const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
      el.indeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length;
    }
  }, [selectedIds, paginatedQuotes]);

  if (!effectiveLocationId) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="inline-flex gap-1" aria-label="Loading">
          <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingDots size="lg" className="text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    const isRateLimit = /429|too many requests|rate limit|temporarily busy/i.test(error);
    const friendlyTitle = isRateLimit ? 'Service is busy' : "We couldn't load quotes";
    const friendlyMessage = isRateLimit
      ? 'Service is temporarily busy. Please try again in a moment.'
      : "Something went wrong while loading quotes. Please try again.";
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
        <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">
          <p className="font-medium">{friendlyTitle}</p>
          <p className="mt-2 text-sm">{friendlyMessage}</p>
          <button
            type="button"
            onClick={() => { setError(null); loadQuotes(); }}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-destructive/50 px-4 py-2 text-sm font-medium hover:bg-destructive/20"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ServiceAreaMapViewModal
        address={serviceAreaMapAddress}
        onClose={() => setServiceAreaMapAddress(null)}
      />
      {/* View quote summary in modal */}
      <Dialog open={!!viewQuoteModal} onOpenChange={(open) => { if (!open) setViewQuoteModal(null); }}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="px-4 py-3 border-b border-border shrink-0 flex flex-row items-center justify-between gap-2">
            <DialogTitle className="text-lg">
              Quote {viewQuoteModal?.quote_id ?? ''}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {viewQuoteModal && (
                <a
                  href={`${typeof window !== 'undefined' ? window.location.origin : ''}/quote/${viewQuoteModal.quote_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </a>
              )}
              <Button variant="ghost" size="sm" onClick={() => setViewQuoteModal(null)}>Close</Button>
            </div>
          </DialogHeader>
          {viewQuoteModal && (
            <div className="flex-1 min-h-0 flex flex-col relative">
              <iframe
                src={`${typeof window !== 'undefined' ? window.location.origin : ''}/quote/${viewQuoteModal.quote_id}`}
                title={`Quote ${viewQuoteModal.quote_id}`}
                className="w-full flex-1 min-h-[70vh] rounded-b-lg border-0 bg-background"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={newQuoteOpen} onOpenChange={(open) => { if (!open) { setNewQuoteOpen(false); setNewQuoteUrl(null); setNewQuoteError(null); } }}>
        <DialogContent className="max-w-[95vw] w-full max-h-[95vh] flex flex-col gap-0 p-0 overflow-hidden" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 py-3 border-b border-border shrink-0">
            <DialogTitle className="text-lg">New Quote</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col p-6 pt-4">
            {newQuoteLoading && (
              <div className="flex items-center justify-center py-24">
                <LoadingDots size="lg" className="text-muted-foreground" />
              </div>
            )}
            {!newQuoteLoading && newQuoteError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-800 dark:text-amber-200 text-sm">
                <p>{newQuoteError}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => setNewQuoteOpen(false)}>Close</Button>
              </div>
            )}
            {!newQuoteLoading && newQuoteUrl && (
              <iframe
                src={newQuoteUrl}
                title="New quote form"
                className="w-full flex-1 min-h-[70vh] rounded-lg border border-border bg-background"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
        <Button onClick={openNewQuoteModal} className="shrink-0" variant="default">
          <Plus className="h-4 w-4 mr-2" />
          New Quote
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={openBulkReassign}
              className="inline-flex items-center gap-2 rounded-md border border-amber-600/50 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Bulk reassign
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-red-600/50 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-500/20 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              Bulk delete
            </button>
          )}
          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted"
          >
            Clear selection
          </button>
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          {effectiveLocationId ? (
            <>
              <p className="text-muted-foreground">
                No quotes yet. Quotes from your tools will appear here.
              </p>
              <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                Back to dashboard
              </Link>
            </>
          ) : (
            <>
              <p className="text-muted-foreground">
                Open CleanQuote from your GoHighLevel location (sub-account) to load quotes from the Quote custom object.
              </p>
              <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
                Back to dashboard
              </Link>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <Filter className="h-4 w-4" />
              Filters
            </span>
            <div className="relative min-w-[160px] max-w-[220px] flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="search"
                placeholder="Search (ID, name, email, address…)"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={filterToolId}
              onChange={(e) => setFilterToolId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-0 max-w-[160px]"
            >
              <option value="">All tools</option>
              {toolOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <select
              value={filterServiceType}
              onChange={(e) => setFilterServiceType(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-0 max-w-[160px]"
            >
              <option value="">All service types</option>
              {serviceTypeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-1 shrink-0">
              {DATE_RANGE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilterDateRange(value)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 ${
                    filterDateRange === value
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-input bg-background hover:bg-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {(filterToolId || filterServiceType || filterSearch.trim() || filterDateRange !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setFilterToolId('');
                  setFilterServiceType('');
                  setFilterSearch('');
                  setFilterDateRange('all');
                }}
                className="rounded-md border border-input px-3 py-2 text-sm hover:bg-muted shrink-0"
              >
                Clear filters
              </button>
            )}
            <span className="text-sm text-muted-foreground shrink-0 ml-auto">
              {filteredQuotes.length === quotes.length
                ? `${quotes.length} quote${quotes.length !== 1 ? 's' : ''}`
                : `${filteredQuotes.length} of ${quotes.length} quote${quotes.length !== 1 ? 's' : ''}`}
            </span>
          </div>

          {filteredQuotes.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
              No quotes match the current filters. Try clearing filters or changing your selection.
            </div>
          ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-10 px-2 py-3">
                    <label className="flex cursor-pointer items-center justify-center">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={paginatedQuotes.length > 0 && paginatedQuotes.every((q) => selectedIds.has(q.id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-input"
                        title="Select all on this page"
                      />
                    </label>
                  </th>
                  <th className="px-4 py-3 font-medium">Quote ID</th>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="min-w-[140px] px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="w-44 px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedQuotes.map((q) => (
                  <tr key={q.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="w-10 px-2 py-3">
                      <label className="flex cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(q.id)}
                          onChange={() => toggleSelection(q.id)}
                          className="h-4 w-4 rounded border-input"
                        />
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewQuoteModal(q)}
                        className="font-mono text-xs text-primary hover:underline text-left"
                      >
                        {q.quote_id}
                      </button>
                    </td>
                    <td className="px-4 py-3">{q.toolName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(q.created_at)}</td>
                    <td className="px-4 py-3">
                      {q.status === 'disqualified' ? (
                        <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                          Disqualified
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Quote</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {q.contactId ? (
                        <Link
                          href={`/dashboard/crm/contacts/${q.contactId}`}
                          className="inline-flex items-center gap-1.5 text-primary hover:underline"
                        >
                          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {q.contactName || [q.first_name, q.last_name].filter(Boolean).join(' ') || q.email || 'Contact'}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">— No contact</span>
                      )}
                    </td>
                    <td className="min-w-[140px] px-4 py-3">
                      {quoteAddressLine(q) ? (
                        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                          <span className="truncate max-w-[180px] text-muted-foreground" title={quoteAddressLine(q)}>
                            {quoteAddressLine(q)}
                          </span>
                          <AddressMapLinks
                            address={quoteAddressLine(q)}
                            showLabel={false}
                            size="sm"
                            onViewServiceAreaMap={setServiceAreaMapAddress}
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {q.service_type || '—'}
                      {q.frequency ? ` · ${q.frequency}` : ''}
                    </td>
                    <td className="px-4 py-3">{q.status === 'disqualified' ? '—' : formatPriceCell(q)}</td>
                    <td className="w-44 px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewQuoteModal(q)}
                          className="inline-flex items-center justify-center rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="View quote"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => copyQuoteLink(q)}
                          className="inline-flex items-center justify-center rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title={copiedQuoteId === q.quote_id ? 'Copied!' : 'Copy quote link'}
                        >
                          {copiedQuoteId === q.quote_id ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => openReassign(q)}
                            className="inline-flex items-center justify-center rounded p-2 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
                            title="Reassign to another org’s tool"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteQuote(q)}
                            className="inline-flex items-center justify-center rounded p-2 text-red-700 hover:bg-red-500/20 dark:text-red-400"
                            title="Delete quote"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                        {q.contactId && (
                          <Link
                            href={`/dashboard/crm/contacts/${q.contactId}`}
                            className="inline-flex items-center justify-center rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="View in CRM"
                          >
                            <User className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 px-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filteredQuotes.length)} of {filteredQuotes.length}
                </span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="rounded border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={250}>250 per page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded border border-input bg-background px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
          )}
        </>
      )}

      {deleteQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
            <h3 className="font-semibold text-foreground">Delete quote</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {deleteQuote.first_name} {deleteQuote.last_name} · {deleteQuote.quote_id}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this quote? This action cannot be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={confirmDeleteQuote}
                disabled={deleting}
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteQuote(null)}
                disabled={deleting}
                className="rounded border border-input px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {reassignQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
            <h3 className="font-semibold text-foreground">Reassign quote to org</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {reassignQuote.first_name} {reassignQuote.last_name} · {reassignQuote.quote_id}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose the tool (org) this quote should belong to. It will then show in that org’s quotes.
            </p>
            <select
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              className="mt-3 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— No tool (legacy) —</option>
              {toolsForReassign.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.org_name} → {t.name}
                </option>
              ))}
            </select>
            {reassignMessage && (
              <p className="mt-2 text-sm text-destructive">{reassignMessage}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={submitReassign}
                disabled={reassigning}
                className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {reassigning ? 'Saving…' : 'Reassign'}
              </button>
              <button
                type="button"
                onClick={() => { setReassignQuote(null); setReassignMessage(null); }}
                className="rounded border border-input px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkReassignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
            <h3 className="font-semibold text-foreground">Bulk reassign {selectedIds.size} quotes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose the tool (org) these quotes should belong to. They will then show in that org's quotes.
            </p>
            <select
              value={selectedToolId}
              onChange={(e) => setSelectedToolId(e.target.value)}
              className="mt-3 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— No tool (legacy) —</option>
              {toolsForReassign.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.org_name} → {t.name}
                </option>
              ))}
            </select>
            {bulkReassignMessage && (
              <p className="mt-2 text-sm text-destructive">{bulkReassignMessage}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={submitBulkReassign}
                disabled={bulkReassigning}
                className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {bulkReassigning ? 'Saving…' : 'Reassign'}
              </button>
              <button
                type="button"
                onClick={() => { setBulkReassignOpen(false); setBulkReassignMessage(null); }}
                className="rounded border border-input px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg">
            <h3 className="font-semibold text-foreground">Bulk delete quotes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedIds.size} quote{selectedIds.size !== 1 ? 's' : ''} selected.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete these quotes? This action cannot be undone.
            </p>
            {bulkReassignMessage && (
              <p className="mt-2 text-sm text-destructive">{bulkReassignMessage}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={confirmBulkDelete}
                disabled={bulkDeleting}
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                {bulkDeleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                onClick={() => { setBulkDeleteOpen(false); setBulkReassignMessage(null); }}
                disabled={bulkDeleting}
                className="rounded border border-input px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
