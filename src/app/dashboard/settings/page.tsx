'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2, Send, Loader2, Save, BookOpen, Sparkles } from 'lucide-react';

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
  const [orgSaving, setOrgSaving] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);
  const [ghlStatus, setGhlStatus] = useState<{ configured: boolean; connected?: boolean; locationId?: string } | null>(null);
  const [ghlToken, setGhlToken] = useState('');
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [ghlSaving, setGhlSaving] = useState(false);
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
          setGhlStatus({ configured: true, connected: d.connected, locationId: d.locationId });
          if (d.locationId) setGhlLocationId(d.locationId);
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

  const saveGhl = async () => {
    if (!orgId) return;
    setGhlSaving(true);
    setGhlMessage(null);
    const payload = { token: ghlToken.trim(), locationId: ghlLocationId.trim() };
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings/page.tsx:saveGhl',message:'saveGhl called',data:{orgId,hasToken:!!payload.token,tokenLen:payload.token.length,hasLocationId:!!payload.locationId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}/ghl-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'settings/page.tsx:saveGhl',message:'saveGhl response',data:{ok:res.ok,status:res.status,error:data.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      if (res.ok) {
        setGhlStatus({ configured: true, connected: data.connected, locationId: data.locationId ?? ghlLocationId.trim() });
        if (data.locationId) setGhlLocationId(data.locationId);
        setGhlMessage('HighLevel connection saved.');
      } else {
        setGhlMessage(data.error ?? 'Failed to save.');
      }
    } finally {
      setGhlSaving(false);
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
          Name, contact email, and phone shown on the out-of-service page and Contact Us for this org&apos;s tools.
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
          One connection per organization. All tools in this org use this HighLevel location. Configure pipelines, calendars, and CRM behavior per tool in each tool&apos;s Settings.
        </p>
        <div className="space-y-3 rounded-lg border p-4">
          {ghlStatus?.configured && (
            <>
              <p className="text-sm text-muted-foreground">
                {ghlStatus.connected ? (
                  <span className="text-green-600 dark:text-green-400">Connected</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Configured; connection could not be verified</span>
                )}
                {ghlStatus.locationId && ` · Location ID: ${ghlStatus.locationId}`}
              </p>
              {ghlStatus.locationId && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">GHL Quoter Button – paste in GHL → Settings → Company → Custom JS:</p>
                  <code className="text-xs block break-all bg-background p-2 rounded border">
                    {`<script src="${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://www.cleanquote.io')}/api/script/cleanquote.js" data-location-id="${ghlStatus.locationId}"></script>`}
                  </code>
                </div>
              )}
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-muted-foreground">API token</label>
            <input
              type="password"
              value={ghlToken}
              onChange={(e) => setGhlToken(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="HighLevel API token"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground">Location ID</label>
            <input
              type="text"
              value={ghlLocationId}
              onChange={(e) => setGhlLocationId(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="HighLevel Location ID"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={saveGhl}
              disabled={ghlSaving || !ghlToken.trim() || !ghlLocationId.trim()}
              className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {ghlSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {ghlSaving ? 'Saving…' : 'Save HighLevel connection'}
            </button>
            <Link href="/help/ghl-integration" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              <BookOpen className="h-3.5 w-3.5" />
              Help
            </Link>
          </div>
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
