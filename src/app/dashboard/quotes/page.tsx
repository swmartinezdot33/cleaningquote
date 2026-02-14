'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Eye, RefreshCw, Search, Filter, Trash2, Copy, Check, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useDashboardApi } from '@/lib/dashboard-api';
import { useDashboardPageState } from '@/lib/dashboard-page-state';
import { copyToClipboard } from '@/lib/utils';
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

type DateRangeKey = 'all' | 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year';

const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
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
    case 'today': {
      const start = startOfDay(now);
      const end = toMs(start) + 24 * 60 * 60 * 1000 - 1;
      return { start: toMs(start), end };
    }
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
      <span className="inline-flex flex-col gap-0.5 text-left">
        <span>Initial: {formatPrice(q.price_initial_low ?? null, q.price_initial_high ?? null)}</span>
        <span>Recurring: {formatPrice(q.price_recurring_low ?? null, q.price_recurring_high ?? null)}</span>
      </span>
    );
  }
  return formatPrice(q.price_low, q.price_high);
}

export default function DashboardQuotesPage() {
  const { api, locationId: effectiveLocationId } = useDashboardApi();
  const searchParams = useSearchParams();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [orgTools, setOrgTools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedLocationIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [deleteQuote, setDeleteQuote] = useState<QuoteRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Server-side pagination: hasMore from API (no total count from GHL)
  const [hasMore, setHasMore] = useState(false);
  // Filters (client-side over current page, persisted per session)
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
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteMessage, setBulkDeleteMessage] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const [serviceAreaMapAddress, setServiceAreaMapAddress] = useState<string | null>(null);
  // New Quote modal (opens default quoter form in iframe)
  const [newQuoteOpen, setNewQuoteOpen] = useState(false);
  const [newQuoteUrl, setNewQuoteUrl] = useState<string | null>(null);
  const [newQuoteError, setNewQuoteError] = useState<string | null>(null);
  const [newQuoteLoading, setNewQuoteLoading] = useState(false);
  // View quote summary in modal (no new tab)
  const [viewQuoteModal, setViewQuoteModal] = useState<QuoteRow | null>(null);
  // Pagination (server-side: API returns one page per request)
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
    const params = new URLSearchParams();
    params.set('page', String(currentPage));
    params.set('perPage', String(perPage));
    Promise.all([
      api(`/api/dashboard/quotes?${params}`),
      api('/api/dashboard/tools'),
    ])
      .then(async ([quotesRes, orgToolsRes]) => {
        if (quotesRes.ok) {
          const data = await quotesRes.json().catch(() => ({})) as {
            quotes?: QuoteRow[];
            isSuperAdmin?: boolean;
            isOrgAdmin?: boolean;
            error?: string;
            hasMore?: boolean;
            page?: number;
            perPage?: number;
          };
          const toolsData = orgToolsRes.ok ? await orgToolsRes.json().catch(() => ({})) as { tools?: { id: string; name: string }[] } : { tools: [] };
          return {
            quotes: data.quotes ?? [],
            orgTools: Array.isArray(toolsData.tools) ? toolsData.tools : [],
            isSuperAdminFromQuotes: !!data.isSuperAdmin,
            isOrgAdminFromQuotes: !!data.isOrgAdmin,
            apiError: data.error,
            hasMore: data.hasMore ?? false,
            page: data.page ?? currentPage,
            perPage: data.perPage ?? perPage,
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
      .then(({ quotes: list, orgTools: toolsList, isSuperAdminFromQuotes, isOrgAdminFromQuotes, apiError, hasMore: more }) => {
        setQuotes(list);
        setOrgTools(toolsList ?? []);
        setIsSuperAdmin(!!isSuperAdminFromQuotes);
        setIsOrgAdmin(!!isOrgAdminFromQuotes);
        if (apiError) setError(apiError);
        setHasMore(more ?? false);
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
  }, [effectiveLocationId, api, currentPage, perPage]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  // Safety net: when locationId appears after we already ran with null (same pattern as DashboardHomeClient), fetch now
  useEffect(() => {
    if (!effectiveLocationId || !api) return;
    if (lastFetchedLocationIdRef.current === effectiveLocationId) return;
    loadQuotes();
  }, [effectiveLocationId, api, loadQuotes]);

  const canDelete = isSuperAdmin || isOrgAdmin;

  const copyQuoteLink = async (q: QuoteRow) => {
    const url = `${baseUrl}/quote/${q.quote_id}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedQuoteId(q.quote_id);
      setTimeout(() => setCopiedQuoteId(null), 2000);
    }
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
    setBulkDeleteMessage(null);
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
        setBulkDeleteMessage(data.error ?? 'Failed to delete');
      }
    } finally {
      setBulkDeleting(false);
    }
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

  // Tool filter: all tools for this org (from /api/dashboard/tools), so the dropdown is populated even when quotes lack tool_id
  const toolOptions = useMemo(() => {
    return [...orgTools].sort((a, b) => a.name.localeCompare(b.name));
  }, [orgTools]);

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

  // Server-side pagination: server returns one page; we filter that page client-side. No total count.
  const paginatedQuotes = filteredQuotes;

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

  // Open New Quote modal when header navigates with ?openNewQuote=1
  useEffect(() => {
    if (searchParams?.get('openNewQuote') === '1' && effectiveLocationId) {
      openNewQuoteModal();
      const url = new URL(window.location.href);
      url.searchParams.delete('openNewQuote');
      window.history.replaceState({}, '', url.pathname + (url.search || ''));
    }
  }, [searchParams?.get('openNewQuote'), effectiveLocationId, openNewQuoteModal]);

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

  const isRateLimit = error ? /429|too many requests|rate limit|temporarily busy/i.test(error) : false;
  const friendlyTitle = isRateLimit ? 'Service is busy' : 'No quotes to show';
  const friendlyMessage = isRateLimit
    ? 'Service is temporarily busy. Please try again in a moment.'
    : 'There may be no quotes yet, or the connection could not be completed. You can try again below.';

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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingDots size="lg" className="text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-border bg-muted/30 p-6 text-foreground">
          <p className="font-medium text-foreground">{friendlyTitle}</p>
          <p className="mt-2 text-sm text-muted-foreground">{friendlyMessage}</p>
          <button
            type="button"
            onClick={() => { setError(null); loadQuotes(); }}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : (
        <>
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
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
            <div className="relative min-w-[180px] max-w-[300px] flex-1">
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
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="min-w-[140px] px-4 py-3 font-medium">Address</th>
                  <th className="max-w-[200px] px-4 py-3 font-medium">Service</th>
                  <th className="max-w-[140px] px-4 py-3 font-medium">Price</th>
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
                      {(() => {
                        const displayName = q.contactName || [q.first_name, q.last_name].filter(Boolean).join(' ') || q.email || null;
                        if (q.contactId) {
                          return (
                            <Link
                              href={`/dashboard/crm/contacts/${q.contactId}`}
                              className="inline-flex items-center gap-1.5 text-primary hover:underline"
                            >
                              <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              {displayName || 'Contact'}
                            </Link>
                          );
                        }
                        if (displayName) {
                          return (
                            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              {displayName}
                            </span>
                          );
                        }
                        return <span className="text-muted-foreground">— No contact</span>;
                      })()}
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
                    <td className="max-w-[200px] px-4 py-3 align-top">
                      <span className="inline-flex flex-col gap-0.5 text-left break-words">
                        {q.service_type ? <span>{q.service_type}</span> : <span>—</span>}
                        {q.frequency ? <span className="text-muted-foreground text-xs sm:text-sm">{q.frequency}</span> : null}
                      </span>
                    </td>
                    <td className="max-w-[140px] px-4 py-3 align-top">{q.status === 'disqualified' ? '—' : formatPriceCell(q)}</td>
                    <td className="w-44 px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewQuoteModal(q)}
                          className="inline-flex items-center justify-center rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="View quote"
                        >
                          <Eye className="h-4 w-4" />
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
                        {q.contactId && effectiveLocationId && (
                          <a
                            href={`https://app.gohighlevel.com/v2/location/${effectiveLocationId}/contacts/detail/${q.contactId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                            title="Open in CRM (GoHighLevel)"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination controls (server-side: no total count, use hasMore for Next) */}
          {(currentPage > 1 || hasMore || quotes.length > 0) && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 px-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {(currentPage - 1) * perPage + 1}–{(currentPage - 1) * perPage + paginatedQuotes.length}
                  {!hasMore && currentPage === 1 ? ` (${paginatedQuotes.length})` : ''}
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
                  Page {currentPage}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!hasMore}
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
            {bulkDeleteMessage && (
              <p className="mt-2 text-sm text-destructive">{bulkDeleteMessage}</p>
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
                onClick={() => { setBulkDeleteOpen(false); setBulkDeleteMessage(null); }}
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
