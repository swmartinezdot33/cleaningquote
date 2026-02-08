'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Search, Filter } from 'lucide-react';
import { useGHLIframe } from '@/lib/ghl-iframe-context';

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  stage: string;
  created_at: string;
}

export default function CRMContactsPage() {
  const { ghlData } = useGHLIframe();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStage, setFilterStage] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const [needsConnect, setNeedsConnect] = useState(false);

  const loadContacts = () => {
    setLoading(true);
    setNeedsConnect(false);
    const params = new URLSearchParams();
    if (filterStage) params.set('stage', filterStage);
    if (search.trim()) params.set('search', search.trim());
    params.set('page', String(page));
    params.set('perPage', String(perPage));
    if (ghlData?.locationId) params.set('locationId', ghlData.locationId);

    console.log('[CRM Contacts] loadContacts ghlData.locationId=', ghlData?.locationId, 'params=', params.toString());
    fetch(`/api/dashboard/crm/contacts?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load'))))
      .then((d) => {
        console.log('[CRM Contacts] API response: contacts=', d.contacts?.length ?? 0, 'needsConnect=', d.needsConnect);
        setContacts(d.contacts ?? []);
        setTotal(d.total ?? 0);
        setNeedsConnect(!!d.needsConnect);
      })
      .catch((e) => {
        setError(e.message);
        setNeedsConnect(!!ghlData?.locationId);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadContacts();
  }, [page, filterStage, ghlData?.locationId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadContacts();
  };

  const totalPages = Math.ceil(total / perPage);

  if (loading && contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All contacts in your CRM
        </p>
      </div>

      {needsConnect && ghlData?.locationId && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-6 text-amber-800 dark:text-amber-200">
          <p className="font-medium">Connect your location</p>
          <p className="mt-2 text-sm">
            This location needs a one-time connection. Click below to authorize CleanQuote to access your CRM data. After connecting, your contacts will load here.
          </p>
          <a
            href={`/api/auth/connect?redirect=${encodeURIComponent('/dashboard/crm')}`}
            className="mt-4 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Connect via OAuth
          </a>
        </div>
      )}

      {typeof window !== 'undefined' &&
        window.self !== window.top &&
        !ghlData?.locationId &&
        !loading &&
        contacts.length === 0 &&
        !error &&
        !needsConnect && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
            <p className="font-medium">Couldn&apos;t detect your CRM location</p>
            <p className="mt-1 text-sm">
              Try refreshing, or open CleanQuote from your sub-account sidebar (not Agency view).
            </p>
          </div>
        )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filters
        </span>
        <form onSubmit={handleSearch} className="flex flex-1 min-w-[180px] max-w-xs gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-input bg-background py-2 pl-8 pr-3 text-sm"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted"
          >
            Search
          </button>
        </form>
        <select
          value={filterStage}
          onChange={(e) => {
            setFilterStage(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All stages</option>
          <option value="lead">Lead</option>
          <option value="quoted">Quoted</option>
          <option value="booked">Booked</option>
          <option value="customer">Customer</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {error && (
        <div className="space-y-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          {typeof window !== 'undefined' &&
            window.self !== window.top &&
            !ghlData?.locationId && (
              <p className="text-sm">
                Open from a sub-account dashboard. Check Shared Secret in GHL Marketplace App → Auth.
              </p>
            )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border/50 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/crm/contacts/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                      {c.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded border border-input px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
