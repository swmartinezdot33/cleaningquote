'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FileDown, ExternalLink, Loader2, ArrowRightLeft, Search, Filter, Trash2, Copy, Check } from 'lucide-react';

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
  square_feet: string | null;
  bedrooms: number | null;
  created_at: string;
  toolName: string;
  toolSlug: string | null;
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

  const loadQuotes = () => {
    Promise.all([
      fetch('/api/dashboard/quotes'),
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
  }, []);

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

  const exportCsv = () => {
    const toExport = filteredQuotes;
    const headers = [
      'Quote ID',
      'Tool',
      'Date',
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
      escapeCsv(formatPrice(q.price_low, q.price_high)),
      escapeCsv(q.square_feet),
      escapeCsv(q.bedrooms),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotes-${new Date().toISOString().slice(0, 10)}.csv`;
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
          onClick={exportCsv}
          disabled={filteredQuotes.length === 0}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" />
          Export CSV
        </button>
      </div>

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
                  <th className="px-4 py-3 font-medium">Quote ID</th>
                  <th className="px-4 py-3 font-medium">Tool</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((q) => (
                  <tr key={q.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs">{q.quote_id}</td>
                    <td className="px-4 py-3">{q.toolName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(q.created_at)}</td>
                    <td className="px-4 py-3">
                      {[q.first_name, q.last_name].filter(Boolean).join(' ') || q.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {q.service_type || '—'}
                      {q.frequency ? ` · ${q.frequency}` : ''}
                    </td>
                    <td className="px-4 py-3">{formatPrice(q.price_low, q.price_high)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
    </div>
  );
}
