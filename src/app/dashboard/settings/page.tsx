'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, Send, Loader2, BookOpen, Sparkles } from 'lucide-react';
import { CANONICAL_SITE_URL } from '@/lib/canonical-url';

interface Member {
  user_id: string;
  role: string;
  email: string | null;
}
interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at?: string;
}

function formatInviteSentAt(createdAt: string | undefined): string {
  if (!createdAt) return '';
  const sent = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - sent.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'Sent today';
  if (diffDays === 1) return 'Sent yesterday';
  if (diffDays < 30) return `Invite sent ${diffDays} days ago`;
  const months = Math.floor(diffDays / 30);
  if (months === 1) return 'Sent a month ago';
  return `Sent ${months} months ago`;
}

export default function SettingsPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [orgContactEmail, setOrgContactEmail] = useState('');
  const [orgContactPhone, setOrgContactPhone] = useState('');
  const [orgOfficeAddress, setOrgOfficeAddress] = useState('');
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);
  const [ghlStatus, setGhlStatus] = useState<{ configured: boolean; connected?: boolean; locationId?: string; useOauth?: boolean } | null>(null);
  const [ghlDisconnecting, setGhlDisconnecting] = useState(false);
  const [ghlMessage, setGhlMessage] = useState<string | null>(null);

  const refreshMembers = () => {
    if (!orgId) return;
    fetch(`/api/dashboard/orgs/${orgId}/members`)
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setInvitations(d.invitations ?? []);
      })
      .catch(() => {});
  };

  const cancelInvite = async (invitationId: string) => {
    if (!orgId) return;
    setCancellingId(invitationId);
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      if (res.ok) refreshMembers();
    } finally {
      setCancellingId(null);
    }
  };

  const resendInvite = async (invitationId: string) => {
    if (!orgId) return;
    setResendingId(invitationId);
    setResendMessage(null);
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}/invitations/${invitationId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        setResendMessage(data.message ?? (data.emailSent ? 'Invite email resent.' : 'Done.'));
      } else {
        setResendMessage(data.error ?? data.message ?? 'Failed to resend.');
      }
    } finally {
      setResendingId(null);
    }
  };

  useEffect(() => {
    fetch('/api/dashboard/orgs/selected')
      .then((r) => r.json())
      .then((d) => {
        setOrgId(d.org?.id ?? null);
        setOrgName(d.org?.name ?? '');
        setOrgContactEmail(d.org?.contact_email ?? '');
        setOrgContactPhone(d.org?.contact_phone ?? '');
        setOrgOfficeAddress((d.org as { office_address?: string } | null)?.office_address ?? '');
        return d.org?.id;
      })
      .then((id) => {
        if (id) return fetch(`/api/dashboard/orgs/${id}/members`).then((r) => r.json());
        return { members: [], invitations: [] };
      })
      .then((d) => {
        setMembers(d.members ?? []);
        setInvitations(d.invitations ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/dashboard/orgs/${orgId}/ghl-settings`)
      .then((r) => r.json())
      .then((d) => {
        if (d.configured) {
          setGhlStatus({ configured: true, connected: d.connected, locationId: d.locationId, useOauth: d.useOauth });
        } else {
          setGhlStatus({ configured: false });
        }
      })
      .catch(() => setGhlStatus({ configured: false }));
  }, [orgId]);

  const saveOrgDetails = async () => {
    if (!orgId) return;
    setOrgSaving(true);
    setOrgMessage(null);
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim() || undefined,
          contact_email: orgContactEmail.trim() || null,
          contact_phone: orgContactPhone.trim() || null,
          office_address: orgOfficeAddress.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrgMessage('Organization details saved.');
      } else {
        setOrgMessage(data.error ?? 'Failed to save.');
      }
    } finally {
      setOrgSaving(false);
    }
  };

  const disconnectGhl = async () => {
    if (!orgId) return;
    setGhlDisconnecting(true);
    setGhlMessage(null);
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}/ghl-settings`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setGhlStatus({ configured: false });
        setGhlMessage('HighLevel disconnected.');
      } else {
        setGhlMessage(data.error ?? 'Failed to disconnect.');
      }
    } finally {
      setGhlDisconnecting(false);
    }
  };

  const sendInvite = async () => {
    if (!orgId || !inviteEmail.trim()) return;
    setSending(true);
    setInviteUrl(null);
    setInviteMessage(null);
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMessage(data.message ?? (data.emailSent ? `Invite email sent to ${inviteEmail.trim()}` : 'Invite created'));
        if (data.added && data.existingUser) {
          refreshMembers();
        } else if (data.invitation) {
          if (!data.emailSent && data.inviteUrl) setInviteUrl(data.inviteUrl);
          setInvitations((prev) => [
            ...prev,
            {
              id: data.invitation.id ?? 'new',
              email: inviteEmail.trim(),
              role: inviteRole,
              expires_at: data.invitation.expires_at ?? '',
            },
          ]);
        }
        setInviteEmail('');
      } else {
        setInviteMessage(data.error ?? 'Failed to send invite');
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div>
        <p className="text-muted-foreground">No organization selected.</p>
        <Link href="/dashboard" className="mt-2 inline-block text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Settings: {orgName}</h1>
        <p className="text-sm text-muted-foreground">Organization details, HighLevel integration, and team members</p>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Organization details</h2>
        <p className="text-sm text-muted-foreground mb-2">
          Name, contact info, and office address. The office address appears as a pin on service area maps and previews.
        </p>
        <div className="space-y-2 rounded-lg border p-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Org name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g. Raleigh Cleaning Company"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Contact email</label>
            <input
              type="email"
              value={orgContactEmail}
              onChange={(e) => setOrgContactEmail(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g. hello@yourcompany.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Contact phone</label>
            <input
              type="tel"
              value={orgContactPhone}
              onChange={(e) => setOrgContactPhone(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g. 919.925.2378"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Office address</label>
            <input
              type="text"
              value={orgOfficeAddress}
              onChange={(e) => setOrgOfficeAddress(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="e.g. 123 Main St, Raleigh, NC 27601"
            />
            <p className="mt-1 text-xs text-muted-foreground">Shown as a pin on service area maps and previews.</p>
          </div>
          <button
            type="button"
            onClick={saveOrgDetails}
            disabled={orgSaving}
            className="mt-2 rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {orgSaving ? 'Saving…' : 'Save organization details'}
          </button>
          {orgMessage && <p className="mt-2 text-sm text-muted-foreground">{orgMessage}</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          HighLevel Integration
        </h2>
        <p className="text-sm text-muted-foreground mb-2">
          One connection per organization. Connect your GHL sub-account to sync quotes, contacts, and appointments. Configure pipelines, calendars, and CRM behavior per tool in each tool&apos;s Settings.
        </p>
        <div className="space-y-3 rounded-lg border p-4">
          {ghlStatus?.configured ? (
            <>
              <p className="text-sm text-muted-foreground">
                {ghlStatus.connected ? (
                  <span className="text-green-600 dark:text-green-400">Connected</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Configured; connection could not be verified</span>
                )}
                {ghlStatus.useOauth && <span className="text-muted-foreground"> · OAuth</span>}
                {ghlStatus.locationId && ` · Location ID: ${ghlStatus.locationId}`}
              </p>
              {ghlStatus.locationId && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">GHL Quoter Button – paste in GHL → Settings → Company → Custom JS:</p>
                  <code className="text-xs block break-all bg-background p-2 rounded border">
                    {`<script src="${typeof window !== 'undefined' ? window.location.origin : CANONICAL_SITE_URL}/api/script/cleanquote.js" data-location-id="${ghlStatus.locationId}"></script>`}
                  </code>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/auth/connect?orgId=${encodeURIComponent(orgId)}&redirect=${encodeURIComponent('/dashboard/settings')}`}
                  className="inline-flex items-center gap-2 rounded border border-primary px-4 py-2 text-sm text-primary hover:bg-primary/5"
                >
                  Reconnect with HighLevel
                </a>
                <button
                  type="button"
                  onClick={disconnectGhl}
                  disabled={ghlDisconnecting}
                  className="inline-flex items-center gap-2 rounded border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50"
                >
                  {ghlDisconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Disconnect
                </button>
                <Link href="/help/ghl-integration" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 self-center text-sm text-primary hover:underline">
                  <BookOpen className="h-3.5 w-3.5" />
                  Help
                </Link>
              </div>
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={`/api/auth/connect?orgId=${encodeURIComponent(orgId)}&redirect=${encodeURIComponent('/dashboard/settings')}`}
                className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                <Sparkles className="h-4 w-4" />
                Connect with HighLevel
              </a>
              <Link href="/help/ghl-integration" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <BookOpen className="h-3.5 w-3.5" />
                Help
              </Link>
            </div>
          )}
          {ghlMessage && <p className="text-sm text-muted-foreground">{ghlMessage}</p>}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Members</h2>
        <ul className="mt-2 space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between rounded-lg border p-3">
              <span>{m.email ?? m.user_id}</span>
              <span className="text-xs text-muted-foreground">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Invite by email</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="email"
            placeholder="email@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="button"
            onClick={sendInvite}
            disabled={sending || !inviteEmail.trim()}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
        {inviteMessage && (
          <p className="mt-2 text-sm text-muted-foreground">
            {inviteMessage}
            {inviteUrl && (
              <> <a href={inviteUrl} className="text-primary underline break-all">{inviteUrl}</a></>
            )}
          </p>
        )}
      </section>

      {invitations.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Pending invitations</h2>
          <ul className="mt-2 space-y-2">
            {invitations.map((i) => (
              <li key={i.id} className="flex flex-col gap-1 rounded-lg border border-dashed p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-2">
                <div className="flex-1 min-w-0">
                  <span className="block">{i.email}</span>
                  {i.created_at && (
                    <span className="text-xs text-muted-foreground/80">{formatInviteSentAt(i.created_at)}</span>
                  )}
                </div>
                <span className="shrink-0">{i.role}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => resendInvite(i.id)}
                    disabled={resendingId === i.id}
                    className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                    title="Resend invite"
                  >
                    {resendingId === i.id ? (
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelInvite(i.id)}
                    disabled={cancellingId === i.id}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    title="Cancel invite"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {resendMessage && (
            <p className="mt-2 text-sm text-muted-foreground">{resendMessage}</p>
          )}
        </section>
      )}
    </div>
  );
}
