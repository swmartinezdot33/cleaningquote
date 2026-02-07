'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Mail, Phone, MapPin, FileText } from 'lucide-react';

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

export default function ContactDetailPage({
  params,
}: {
  params: { id: string } | Promise<{ id: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [data, setData] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    if (params && typeof (params as Promise<unknown>).then === 'function') {
      (params as Promise<{ id: string }>).then(setResolvedParams);
    } else {
      setResolvedParams(params as { id: string });
    }
  }, [params]);

  useEffect(() => {
    if (!resolvedParams?.id) return;

    fetch(`/api/dashboard/crm/contacts/${resolvedParams.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Not found'))))
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [resolvedParams?.id]);

  const addNote = () => {
    if (!noteContent.trim() || !resolvedParams?.id) return;
    setAddingNote(true);
    fetch(`/api/dashboard/crm/contacts/${resolvedParams.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: noteContent.trim() }),
    })
      .then((r) => {
        if (r.ok) {
          setNoteContent('');
          return fetch(`/api/dashboard/crm/contacts/${resolvedParams.id}`).then((x) => x.json());
        }
        throw new Error('Failed to add note');
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setAddingNote(false));
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const name = [data.contact.first_name, data.contact.last_name].filter(Boolean).join(' ') || 'Unknown';

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/crm/contacts" className="text-sm text-muted-foreground hover:underline mb-2 inline-block">
            ← Back to contacts
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{name}</h1>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            {data.contact.email && (
              <a href={`mailto:${data.contact.email}`} className="flex items-center gap-1.5 hover:text-primary">
                <Mail className="h-4 w-4" />
                {data.contact.email}
              </a>
            )}
            {data.contact.phone && (
              <a href={`tel:${data.contact.phone}`} className="flex items-center gap-1.5 hover:text-primary">
                <Phone className="h-4 w-4" />
                {data.contact.phone}
              </a>
            )}
          </div>
          <span className="mt-2 inline-flex rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize">
            {data.contact.stage}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Properties & Quotes */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Properties & Quotes</h2>
          {data.properties.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No properties yet.</p>
          ) : (
            <ul className="mt-4 space-y-4">
              {data.properties.map((p) => {
                const addr = [p.address, p.city, p.state, p.postal_code].filter(Boolean).join(', ');
                const propQuotes = data.quotes.filter((q) => q.property_id === p.id);
                return (
                  <li key={p.id} className="rounded-lg border border-border p-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                      <div>
                        {p.nickname && (
                          <p className="font-medium text-foreground">{p.nickname}</p>
                        )}
                        <p className="text-sm text-muted-foreground">{addr || 'No address'}</p>
                        <span className="mt-1 inline-flex rounded bg-muted px-1.5 py-0.5 text-xs capitalize">
                          {p.stage}
                        </span>
                        {propQuotes.length > 0 && (
                          <ul className="mt-3 space-y-1">
                            {propQuotes.map((q) => (
                              <li key={q.id}>
                                <Link
                                  href={`/quote/${q.quote_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-primary hover:underline"
                                >
                                  {q.quote_id} — {q.service_type || '—'}
                                  {q.price_low != null && q.price_high != null && ` ($${q.price_low}–$${q.price_high})`}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Schedules */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Recurring Schedules</h2>
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
        </div>

        {/* Appointments */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Appointments</h2>
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
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold text-foreground">Notes</h2>
          <div className="mt-4 flex gap-2">
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add a note…"
              className="min-h-[80px] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={2}
            />
            <button
              type="button"
              onClick={addNote}
              disabled={!noteContent.trim() || addingNote}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {addingNote ? 'Adding…' : 'Add'}
            </button>
          </div>
          <ul className="mt-4 space-y-2">
            {data.notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="whitespace-pre-wrap">{n.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Activity timeline */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-semibold text-foreground">Activity</h2>
        {data.activities.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.activities.map((a) => (
              <li key={a.id} className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="capitalize">{a.type.replace('_', ' ')}</span>
                <span className="text-muted-foreground">— {a.title}</span>
                <span className="ml-auto text-muted-foreground">
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
