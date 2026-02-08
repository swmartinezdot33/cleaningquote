'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { FileDown, ExternalLink, Loader2, ArrowRightLeft, Search, Filter, Trash2, Copy, Check, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { useGHLIframe } from '@/lib/ghl-iframe-context';

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

function formatPriceCellString(q: QuoteRow): string {
  const hasInitial = q.price_initial_low != null && q.price_initial_high != null;
  const hasRecurring = q.price_recurring_low != null && q.price_recurring_high != null;
  if (hasInitial && hasRecurring) {
    return `Initial: ${formatPrice(q.price_initial_low ?? null, q.price_initial_high ?? null)}; Recurring: ${formatPrice(q.price_recurring_low ?? null, q.price_recurring_high ?? null)}`;
  }
  return formatPrice(q.price_low, q.price_high);
}

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null || val === '') return '';
  const s = String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

interface ToolOption {
  id: string;
  name: string;
  slug: string;
  org_id: string;
  org_name: string;
}

export default function DashboardQuotesPage() {
  const { ghlData } = useGHLIframe();
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
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
  // Filters (client-side)
  const [filterToolId, setFilterToolId] = useState<string>('');
  const [filterServiceType, setFilterServiceType] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [copiedQuoteId, setCopiedQuoteId] = useState<string | null>(null);
  // Bulk selection and actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReassignOpen, setBulkReassignOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkReassigning, setBulkReassigning] = useState(false);
  const [bulkReassignMessage, setBulkReassignMessage] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const loadQuotes = () => {
    const quotesUrl = ghlData?.locationId
      ? `/api/dashboard/quotes?locationId=${ghlData.locationId}`
      : '/api/dashboard/quotes';
    Promise.all([
      fetch(quotesUrl),
      fetch('/api/dashboard/super-admin/tools'),
    ])
      .then(([quotesRes, toolsRes]) => {
        return quotesRes.ok
          ? quotesRes.json().then((data: { quotes?: QuoteRow[]; isSuperAdmin?: boolean; isOrgAdmin?: boolean }) => ({
              quotes: data.quotes ?? [],
              isSuperAdminFromQuotes: !!data.isSuperAdmin,
              isOrgAdminFromQuotes: !!data.isOrgAdmin,
              toolsOk: toolsRes.ok,
            }))
          : Promise.reject(new Error('Failed to load quotes'));
      })
      .then(({ quotes: list, isSuperAdminFromQuotes, isOrgAdminFromQuotes, toolsOk }) => {
        setQuotes(list);
        setIsSuperAdmin(!!isSuperAdminFromQuotes || !!toolsOk);
        setIsOrgAdmin(!!isOrgAdminFromQuotes);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadQuotes();
  }, [ghlData?.locationId]);

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
      const res = await fetch(`/api/dashboard/quotes/${deleteQuote.id}`, { method: 'DELETE' });
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
      const res = await fetch('/api/dashboard/quotes/bulk-delete', {
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
      const res = await fetch('/api/dashboard/quotes/bulk-reassign', {
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

  const exportCsv = (onlySelected = false) => {
    const toExport = onlySelected && selectedIds.size > 0 ? selectedQuotes : filteredQuotes;
    const headers = [
      'Quote ID',
      'Tool',
      'Date',
      'Status',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Address',
      'City',
      'State',
      'Postal Code',
      'Service Type',
      'Frequency',
      'Price Range',
      'Sq Ft',
      'Bedrooms',
    ];
    const rows = toExport.map((q) => [
      escapeCsv(q.quote_id),
      escapeCsv(q.toolName),
      escapeCsv(formatDate(q.created_at)),
      escapeCsv(q.status === 'disqualified' ? 'Disqualified' : 'Quote'),
      escapeCsv(q.first_name),
      escapeCsv(q.last_name),
      escapeCsv(q.email),
      escapeCsv(q.phone),
      escapeCsv(q.address),
      escapeCsv(q.city),
      escapeCsv(q.state),
      escapeCsv(q.postal_code),
      escapeCsv(q.service_type),
      escapeCsv(q.frequency),
      escapeCsv(q.status === 'disqualified' ? '—' : formatPriceCellString(q)),
      escapeCsv(q.square_feet),
      escapeCsv(q.bedrooms),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = onlySelected
      ? `quotes-selected-${toExport.length}-${new Date().toISOString().slice(0, 10)}.csv`
      : `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
      return true;
    });
  }, [quotes, filterToolId, filterServiceType, filterSearch]);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterToolId, filterServiceType, filterSearch]);

  // Update select-all checkbox indeterminate state
  useEffect(() => {
    const el = selectAllRef.current;
    if (el && paginatedQuotes.length > 0) {
      const pageIds = paginatedQuotes.map((q) => q.id);
      const selectedOnPage = pageIds.filter((id) => selectedIds.has(id)).length;
      el.indeterminate = selectedOnPage > 0 && selectedOnPage < pageIds.length;
    }
  }, [selectedIds, paginatedQuotes]);

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
        <p>Could not load quotes: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
        <button
          onClick={() => exportCsv(false)}
          disabled={filteredQuotes.length === 0}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            onClick={() => exportCsv(true)}
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
          >
            <FileDown className="h-4 w-4" />
            Export selected
          </button>
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
          <p className="text-muted-foreground">No quotes yet. Quotes submitted through your tools will appear here.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
            Back to dashboard
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Filters
            </span>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search quote ID, name, email, address…"
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={filterToolId}
              onChange={(e) => setFilterToolId(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All service types</option>
              {serviceTypeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {(filterToolId || filterServiceType || filterSearch.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setFilterToolId('');
                  setFilterServiceType('');
                  setFilterSearch('');
                }}
                className="rounded-md border border-input px-3 py-2 text-sm hover:bg-muted"
              >
                Clear filters
              </button>
            )}
            <span className="text-sm text-muted-foreground">
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
                    <td className="px-4 py-3 font-mono text-xs">{q.quote_id}</td>
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
                      {[q.first_name, q.last_name].filter(Boolean).join(' ') || q.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {q.service_type || '—'}
                      {q.frequency ? ` · ${q.frequency}` : ''}
                    </td>
                    <td className="px-4 py-3">{q.status === 'disqualified' ? '—' : formatPriceCell(q)}</td>
                    <td className="w-44 px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`${baseUrl}/quote/${q.quote_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          title="View quote"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
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
