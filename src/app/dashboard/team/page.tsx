'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
}

export default function TeamPage() {
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

  useEffect(() => {
    fetch('/api/dashboard/orgs/selected')
      .then((r) => r.json())
      .then((d) => {
        setOrgId(d.org?.id ?? null);
        setOrgName(d.org?.name ?? '');
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
        if (!data.emailSent && data.inviteUrl) setInviteUrl(data.inviteUrl);
        setInvitations((prev) => [
          ...prev,
          {
            id: data.invitation?.id ?? 'new',
            email: inviteEmail.trim(),
            role: inviteRole,
            expires_at: data.invitation?.expires_at ?? '',
          },
        ]);
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
        <h1 className="mt-2 text-2xl font-bold">Team: {orgName}</h1>
        <p className="text-sm text-muted-foreground">Invite users to join this subaccount</p>
      </div>

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
              <li key={i.id} className="flex items-center justify-between rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                <span>{i.email}</span>
                <span>{i.role}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
