'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  FileText,
  Home,
  DollarSign,
  User,
  Tag,
  ChevronLeft,
} from 'lucide-react';
import { useDashboardApi } from '@/lib/dashboard-api';
import { getVisibleDisplayFields } from '@/lib/crm/contact-display-fields';
import { AddressMapLinks } from '@/components/AddressMapLinks';
import { LoadingDots } from '@/components/ui/loading-dots';
import { ServiceAreaMapViewModal } from '@/components/ServiceAreaMapViewModal';

interface ContactDetail {
  contact: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    stage: string;
    source: string | null;
    tags: string[];
    created_at: string;
  };
  customFields?: Record<string, string>;
  address?: {
    street: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  };
  properties: Array<{
    id: string;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    nickname: string | null;
    stage: string;
  }>;
  quotes: Array<{
    id: string;
    quote_id: string;
    service_type: string | null;
    frequency: string | null;
    price_low: number | null;
    price_high: number | null;
    created_at: string;
    property_id: string | null;
  }>;
  schedules: Array<{
    id: string;
    property_id: string;
    frequency: string;
    preferred_day: string | null;
    price_per_visit: number | null;
  }>;
  appointments: Array<{
    id: string;
    scheduled_at: string;
    service_type: string | null;
    status: string;
  }>;
  activities: Array<{
    id: string;
    type: string;
    title: string;
    created_at: string;
  }>;
  notes: Array<{
    id: string;
    content: string;
    created_at: string;
  }>;
}

function getInitials(first: string | null, last: string | null): string {
  const a = (first ?? '').trim().charAt(0);
  const b = (last ?? '').trim().charAt(0);
  if (a && b) return `${a}${b}`.toUpperCase();
  if (a) return a.toUpperCase();
  if (b) return b.toUpperCase();
  return '?';
}

export default function ContactDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const { api } = useDashboardApi();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [data, setData] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [serviceAreaMapAddress, setServiceAreaMapAddress] = useState<string | null>(null);

  useEffect(() => {
    if (params && typeof (params as Promise<unknown>).then === 'function') {
      (params as Promise<{ id: string }>).then(setResolvedParams);
    } else {
      setResolvedParams(params as { id: string });
    }
  }, [params]);

  useEffect(() => {
    if (!resolvedParams?.id || !api) return;
    api(`/api/dashboard/crm/contacts/${resolvedParams.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Not found'))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [resolvedParams?.id, api]);

  const addNote = () => {
    if (!noteContent.trim() || !resolvedParams?.id || !api) return;
    setAddingNote(true);
    api(`/api/dashboard/crm/contacts/${resolvedParams.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteContent.trim() }),
    })
      .then((r) => {
        if (r.ok) {
          setNoteContent('');
          return api(`/api/dashboard/crm/contacts/${resolvedParams.id}`).then((x) => x.json());
        }
        throw new Error('Failed to add note');
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setAddingNote(false));
  };

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        <p>{error}</p>
        <Link href="/dashboard/crm/contacts" className="mt-2 inline-block text-sm underline">
          Back to contacts
        </Link>
      </div>
    );
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingDots size="lg" className="text-muted-foreground" />
      </div>
    );
  }

  const name = [data.contact.first_name, data.contact.last_name].filter(Boolean).join(' ') || 'Unknown';
  const initials = getInitials(data.contact.first_name, data.contact.last_name);
  const displayFields = getVisibleDisplayFields(data.customFields ?? {});
  const hasAddress =
    data.address &&
    [data.address.street, data.address.city, data.address.state, data.address.postal_code, data.address.country].some(
      (x) => x != null && String(x).trim() !== ''
    );
  const addressLine = data.address
    ? [data.address.street, data.address.city, data.address.state, data.address.postal_code, data.address.country]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Back */}
      <Link
        href="/dashboard/crm/contacts"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to contacts
      </Link>

      {/* CleanQuote contact header */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="bg-gradient-to-br from-primary/8 via-background to-primary/5 px-6 py-8 sm:px-8">
          <div className="flex flex-wrap items-start gap-6">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground shadow-md"
              aria-hidden
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {data.contact.email && (
                  <a
                    href={`mailto:${data.contact.email}`}
                    className="inline-flex items-center gap-1.5 hover:text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4 shrink-0" />
                    {data.contact.email}
                  </a>
                )}
                {data.contact.phone && (
                  <a
                    href={`tel:${data.contact.phone}`}
                    className="inline-flex items-center gap-1.5 hover:text-primary hover:underline"
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    {data.contact.phone}
                  </a>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border bg-muted/80 px-3 py-1 text-xs font-medium capitalize text-foreground">
                  {data.contact.stage}
                </span>
                {data.contact.tags.length > 0 && (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    {data.contact.tags.slice(0, 8).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-muted/70 px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {data.contact.tags.length > 8 && (
                      <span className="text-xs text-muted-foreground">+{data.contact.tags.length - 8} more</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Address (if we have it from GHL) */}
      {hasAddress && addressLine && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <MapPin className="h-4 w-4" />
            Address
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-foreground">{addressLine}</p>
            <AddressMapLinks
              address={addressLine}
              showLabel
              size="sm"
              onViewServiceAreaMap={setServiceAreaMapAddress}
            />
          </div>
        </section>
      )}

      <ServiceAreaMapViewModal
        address={serviceAreaMapAddress}
        onClose={() => setServiceAreaMapAddress(null)}
      />

      {/* CleanQuote Home & Quote info (curated GHL custom fields) */}
      {(displayFields.quote.length > 0 || displayFields.home.length > 0 || displayFields.lead.length > 0) && (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {(displayFields.quote.length > 0 || displayFields.lead.length > 0) && (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Quote & lead
              </h2>
              <dl className="mt-4 space-y-3">
                {displayFields.quote.map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
                {displayFields.lead.map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {displayFields.home.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Home className="h-4 w-4" />
                Home information
              </h2>
              <dl className="mt-4 space-y-3">
                {displayFields.home.map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}

      {/* Quotes associated with this contact */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          Quotes
        </h2>
        {data.quotes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No quotes yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {data.quotes.map((q) => (
              <li key={q.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <Link
                  href={`/quote/${q.quote_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {q.quote_id}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {q.service_type && <span className="capitalize">{q.service_type.replace(/-/g, ' ')}</span>}
                  {q.frequency && <span>· {q.frequency.replace(/-/g, ' ')}</span>}
                  {q.price_low != null && q.price_high != null && (
                    <span>· ${q.price_low}–${q.price_high}</span>
                  )}
                  <span>· {new Date(q.created_at).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Properties associated with this contact */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <Home className="h-4 w-4" />
          Properties
        </h2>
        {data.properties.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No properties yet.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {data.properties.map((p) => {
              const addr = [p.address, p.city, p.state, p.postal_code].filter(Boolean).join(', ');
              return (
                <li key={p.id} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    <div className="min-w-0 flex-1">
                      {p.nickname && <p className="font-medium text-foreground">{p.nickname}</p>}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm text-muted-foreground">{addr || 'No address'}</p>
                        {addr && (
                          <AddressMapLinks
                            address={addr}
                            showLabel
                            size="sm"
                            onViewServiceAreaMap={setServiceAreaMapAddress}
                          />
                        )}
                      </div>
                      <span className="mt-1 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-xs capitalize">
                        {p.stage}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {/* Schedules */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recurring schedules
          </h2>
          {data.schedules.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No schedules.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.schedules.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span className="capitalize">{s.frequency.replace('_', '-')}</span>
                  {s.preferred_day && <span>· {s.preferred_day}</span>}
                  {s.price_per_visit != null && (
                    <span className="text-muted-foreground">· ${s.price_per_visit / 100}/visit</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Appointments */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Appointments</h2>
          {data.appointments.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No appointments.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.appointments.map((a) => (
                <li key={a.id} className="text-sm">
                  {new Date(a.scheduled_at).toLocaleString()} — {a.service_type || '—'}
                  <span className="ml-2 text-muted-foreground capitalize">({a.status})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Notes */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Notes</h2>
        <div className="mt-4 flex gap-2">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add a note…"
            className="min-h-[80px] flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            rows={2}
          />
          <button
            type="button"
            onClick={addNote}
            disabled={!noteContent.trim() || addingNote}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {addingNote ? 'Adding…' : 'Add'}
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {data.notes.map((n) => (
            <li key={n.id} className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="whitespace-pre-wrap">{n.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Activity */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <FileText className="h-4 w-4" />
          Activity
        </h2>
        {data.activities.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.activities.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="capitalize">{a.type.replace('_', ' ')}</span>
                <span className="text-muted-foreground">— {a.title}</span>
                <span className="ml-auto text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
