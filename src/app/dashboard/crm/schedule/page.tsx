'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';
import { useEffectiveLocationId } from '@/lib/ghl-iframe-context';

interface Schedule {
  id: string;
  property_id: string;
  frequency: string;
  preferred_day: string | null;
  preferred_time_slot: string | null;
  price_per_visit: number | null;
  status: string;
  start_date: string | null;
}

interface Property {
  id: string;
  contact_id: string;
  address: string | null;
  city: string | null;
  nickname: string | null;
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

export default function CRMSchedulePage() {
  const effectiveLocationId = useEffectiveLocationId();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [propertyMap, setPropertyMap] = useState<Record<string, Property>>({});
  const [contactMap, setContactMap] = useState<Record<string, Contact>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contactsUrl = effectiveLocationId
    ? `/api/dashboard/crm/contacts?perPage=500&locationId=${effectiveLocationId}`
    : '/api/dashboard/crm/contacts?perPage=500';
  const contactDetailUrl = (id: string) =>
    effectiveLocationId
      ? `/api/dashboard/crm/contacts/${id}?locationId=${effectiveLocationId}`
      : `/api/dashboard/crm/contacts/${id}`;

  useEffect(() => {
    fetch(contactsUrl)
      .then((r) => (r.ok ? r.json() : { contacts: [] }))
      .then(async (contactsRes) => {
        const contacts = contactsRes.contacts ?? [];
        const contactMap: Record<string, Contact> = {};
        contacts.forEach((c: Contact) => { contactMap[c.id] = c; });

        const scheduleList: Schedule[] = [];
        const propMap: Record<string, Property> = {};

        for (const c of contacts) {
          const detailRes = await fetch(contactDetailUrl(c.id));
          if (!detailRes.ok) continue;
          const detail = await detailRes.json();
          for (const p of detail.properties ?? []) {
            propMap[p.id] = p;
          }
          for (const s of detail.schedules ?? []) {
            if (s.status === 'active') {
              scheduleList.push(s);
            }
          }
        }

        setSchedules(scheduleList);
        setPropertyMap(propMap);
        setContactMap(contactMap);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [effectiveLocationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingDots size="lg" className="text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        <p>Could not load schedule: {error}</p>
      </div>
    );
  }

  const freqLabel: Record<string, string> = {
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    four_week: 'Every 4 weeks',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recurring cleaning schedules by property
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Active Schedules</h2>
        </div>

        {schedules.length === 0 ? (
          <p className="text-muted-foreground">No recurring schedules yet.</p>
        ) : (
          <div className="space-y-4">
            {schedules.map((s) => {
              const prop = propertyMap[s.property_id];
              const contact = prop ? contactMap[prop.contact_id] : null;
              const addr = prop
                ? [prop.address, prop.city].filter(Boolean).join(', ') || prop.nickname || '—'
                : '—';
              const contactName = contact
                ? [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '—'
                : '—';

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {contactName} — {addr}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {freqLabel[s.frequency] ?? s.frequency}
                      {s.preferred_day && ` · ${s.preferred_day}`}
                      {s.preferred_time_slot && ` · ${s.preferred_time_slot}`}
                      {s.price_per_visit != null && ` · $${s.price_per_visit / 100}/visit`}
                    </p>
                  </div>
                  {prop && (
                    <Link
                      href={`/dashboard/crm/contacts/${prop.contact_id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      View contact
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
