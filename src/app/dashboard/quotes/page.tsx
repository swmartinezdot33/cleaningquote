'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileDown, ExternalLink, Loader2 } from 'lucide-react';

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

export default function DashboardQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard/quotes')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((data) => setQuotes(data.quotes ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
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
    const rows = quotes.map((q) => [
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
          disabled={quotes.length === 0}
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
                {quotes.map((q) => (
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
                      <a
                        href={`${baseUrl}/quote/${q.quote_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        View <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
