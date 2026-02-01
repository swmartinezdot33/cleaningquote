'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, KeyRound, Link2, Copy, UserPlus } from 'lucide-react';

interface User {
  id: string;
  email: string | null;
  created_at: string;
  email_confirmed_at?: string | null;
}
interface Org {
  id: string;
  name: string;
  slug: string;
}
interface Member {
  org_id: string;
  user_id: string;
  role: string;
}

export default function SuperAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<{ memberCount: Record<string, number>; toolCount: Record<string, number> }>({ memberCount: {}, toolCount: {} });
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [newAssign, setNewAssign] = useState({ user_id: '', org_id: '', role: 'member' });
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: '', slug: '', admin_id: '' });
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [editOrg, setEditOrg] = useState({ name: '', slug: '' });
  const [savingOrg, setSavingOrg] = useState(false);
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', org_id: '', role: 'member' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [setPasswordUserId, setSetPasswordUserId] = useState<string | null>(null);
  const [setPasswordValue, setSetPasswordValue] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [resetLinkUserId, setResetLinkUserId] = useState<string | null>(null);
  const [resetLinkResult, setResetLinkResult] = useState<{ link: string; email: string } | null>(null);
  const [loadingResetLink, setLoadingResetLink] = useState(false);
  const [assignModalUserId, setAssignModalUserId] = useState<string | null>(null);

  const load = () => {
    setMessage(null);
    Promise.all([
      fetch('/api/dashboard/super-admin/users'),
      fetch('/api/dashboard/super-admin/orgs'),
      fetch('/api/dashboard/super-admin/memberships'),
      fetch('/api/dashboard/super-admin/orgs/stats'),
    ]).then(async ([ru, ro, rm, rs]) => {
      const [u, o, m, s] = await Promise.all([ru.json(), ro.json(), rm.json(), rs.json()]);
      if (ru.status === 403 || u.error === 'Forbidden') {
        setMessage({
          type: 'error',
          text: 'Forbidden: Your email is not in SUPER_ADMIN_EMAILS. Add your email to SUPER_ADMIN_EMAILS in .env.local (local) or Vercel env vars (production), then restart the dev server.',
        });
        return;
      }
      setUsers(u.users ?? []);
      setOrgs(o.error ? [] : (o.orgs ?? []));
      setMembers(m.error ? [] : (m.members ?? []));
      setStats(s.memberCount ? s : { memberCount: {}, toolCount: s.toolCount ?? {} });
    }).catch(() => setMessage({ type: 'error', text: 'Failed to load data' })).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const membersByUser = members.reduce((acc, m) => {
    if (!acc[m.user_id]) acc[m.user_id] = [];
    acc[m.user_id].push(m);
    return acc;
  }, {} as Record<string, Member[]>);

  const orgById = Object.fromEntries(orgs.map((o) => [o.id, o]));
  const userById = Object.fromEntries(users.map((u) => [u.id, u]));

  const assign = async () => {
    if (!newAssign.user_id || !newAssign.org_id) return;
    setAssigning(newAssign.user_id + newAssign.org_id);
    try {
      const res = await fetch('/api/dashboard/super-admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssign),
      });
      if (res.ok) {
        setMembers((prev) => [...prev.filter((x) => !(x.user_id === newAssign.user_id && x.org_id === newAssign.org_id)), { org_id: newAssign.org_id, user_id: newAssign.user_id, role: newAssign.role }]);
        setNewAssign({ user_id: '', org_id: '', role: 'member' });
        setAssignModalUserId(null);
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.error ?? 'Failed to assign' });
      }
    } finally {
      setAssigning(null);
    }
  };

  const unassign = async (userId: string, orgId: string) => {
    setAssigning(userId + orgId);
    try {
      const res = await fetch(
        `/api/dashboard/super-admin/assign?user_id=${encodeURIComponent(userId)}&org_id=${encodeURIComponent(orgId)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => !(m.user_id === userId && m.org_id === orgId)));
      }
    } finally {
      setAssigning(null);
    }
  };

  const updateRole = async (userId: string, orgId: string, role: string) => {
    setAssigning(userId + orgId);
    try {
      const res = await fetch('/api/dashboard/super-admin/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, org_id: orgId, role }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => (m.user_id === userId && m.org_id === orgId ? { ...m, role } : m)));
      }
    } finally {
      setAssigning(null);
    }
  };

  const createOrg = async () => {
    if (!newOrg.name.trim()) return;
    setCreatingOrg(true);
    try {
      const res = await fetch('/api/dashboard/super-admin/orgs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newOrg.name.trim(),
          slug: newOrg.slug.trim() || undefined,
          admin_id: newOrg.admin_id || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrgs((prev) => [...prev, data.org]);
        setShowCreateOrg(false);
        setNewOrg({ name: '', slug: '', admin_id: '' });
        load();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to create org' });
      }
    } finally {
      setCreatingOrg(false);
    }
  };

  const startEditOrg = (org: Org) => {
    setEditingOrg(org.id);
    setEditOrg({ name: org.name, slug: org.slug });
  };

  const saveOrg = async () => {
    if (!editingOrg) return;
    setSavingOrg(true);
    try {
      const res = await fetch(`/api/dashboard/super-admin/orgs/${editingOrg}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editOrg),
      });
      const data = await res.json();
      if (res.ok) {
        setOrgs((prev) => prev.map((o) => (o.id === editingOrg ? data.org : o)));
        setEditingOrg(null);
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to update org' });
      }
    } finally {
      setSavingOrg(false);
    }
  };

  const deleteOrg = async (orgId: string) => {
    const org = orgs.find((o) => o.id === orgId);
    const memberCount = stats.memberCount[orgId] ?? 0;
    const toolCount = stats.toolCount[orgId] ?? 0;
    if (!confirm(`Permanently delete org "${org?.name ?? orgId}"? This will remove ${memberCount} member(s) and ${toolCount} tool(s). Cannot be recovered.`)) return;
    setDeletingOrgId(orgId);
    try {
      const res = await fetch(`/api/dashboard/super-admin/orgs/${encodeURIComponent(orgId)}`, { method: 'DELETE' });
      if (res.ok) {
        setOrgs((prev) => prev.filter((o) => o.id !== orgId));
        setMembers((prev) => prev.filter((m) => m.org_id !== orgId));
        setMessage({ type: 'success', text: 'Organization deleted.' });
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.error ?? 'Failed to delete org' });
      }
    } finally {
      setDeletingOrgId(null);
    }
  };

  const createUser = async () => {
    if (!newUser.email.trim() || !newUser.password) return;
    setCreatingUser(true);
    try {
      const res = await fetch('/api/dashboard/super-admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUser.email.trim(),
          password: newUser.password,
          org_id: newUser.org_id || undefined,
          role: newUser.role,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) => [...prev, data.user]);
        if (data.user && newUser.org_id) {
          setMembers((prev) => [...prev, { user_id: data.user.id, org_id: newUser.org_id, role: newUser.role }]);
        }
        setShowCreateUser(false);
        setNewUser({ email: '', password: '', org_id: '', role: 'member' });
        load();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to create user' });
      }
    } finally {
      setCreatingUser(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Permanently delete this user? They will lose access and cannot be recovered.')) return;
    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/dashboard/super-admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        setMessage({ type: 'success', text: 'User deleted.' });
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.error ?? 'Failed to delete user' });
      }
    } finally {
      setDeletingUserId(null);
    }
  };

  const saveNewPassword = async () => {
    if (!setPasswordUserId || !setPasswordValue || setPasswordValue.length < 6) return;
    setSavingPassword(true);
    try {
      const res = await fetch(`/api/dashboard/super-admin/users/${encodeURIComponent(setPasswordUserId)}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: setPasswordValue }),
      });
      if (res.ok) {
        setMessage({
          type: 'success',
          text: 'Password updated. They must sign out and sign in with the new password.',
        });
        setSetPasswordUserId(null);
        setSetPasswordValue('');
      } else {
        const d = await res.json();
        setMessage({ type: 'error', text: d.error ?? 'Failed to set password' });
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const sendResetLink = async (userId: string) => {
    setResetLinkUserId(userId);
    setResetLinkResult(null);
    setLoadingResetLink(true);
    try {
      const res = await fetch(`/api/dashboard/super-admin/users/${encodeURIComponent(userId)}/send-reset-link`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.link) {
        setResetLinkResult({ link: data.link, email: data.email ?? '' });
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to generate reset link' });
      }
    } finally {
      setLoadingResetLink(false);
      setResetLinkUserId(null);
    }
  };

  const copyResetLink = () => {
    if (resetLinkResult?.link) {
      navigator.clipboard.writeText(resetLinkResult.link);
      setMessage({ type: 'success', text: 'Link copied to clipboard.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-primary hover:underline">
          ← Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-amber-600">Super Admin</h1>
        <p className="text-sm text-muted-foreground">Manage users and organizations</p>
      </div>

      {message && (
        <div className={`rounded-lg border p-3 text-sm ${message.type === 'error' ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-green-500/50 bg-green-500/10 text-green-700'}`}>
          {message.text}
        </div>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Organizations ({orgs.length})</h2>
          <button
            type="button"
            onClick={() => setShowCreateOrg(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create org
          </button>
        </div>
        {showCreateOrg && (
          <div className="mt-3 rounded-lg border bg-muted/30 p-4">
            <h3 className="text-sm font-medium mb-2">New organization</h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Name"
                value={newOrg.name}
                onChange={(e) => setNewOrg((p) => ({ ...p, name: e.target.value }))}
                className="rounded border px-3 py-2 text-sm w-40"
              />
              <input
                type="text"
                placeholder="Slug (optional)"
                value={newOrg.slug}
                onChange={(e) => setNewOrg((p) => ({ ...p, slug: e.target.value }))}
                className="rounded border px-3 py-2 text-sm w-32"
              />
              <select
                value={newOrg.admin_id}
                onChange={(e) => setNewOrg((p) => ({ ...p, admin_id: e.target.value }))}
                className="rounded border px-3 py-2 text-sm w-48"
              >
                <option value="">No admin (add later)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.email ?? u.id}</option>
                ))}
              </select>
              <button onClick={createOrg} disabled={creatingOrg} className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
                {creatingOrg ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => setShowCreateOrg(false)} className="rounded border px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="mt-2 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Slug</th>
                <th className="p-3 text-left">Members</th>
                <th className="p-3 text-left">Tools</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.id} className="border-b">
                  {editingOrg === o.id ? (
                    <>
                      <td className="p-3">
                        <input
                          value={editOrg.name}
                          onChange={(e) => setEditOrg((p) => ({ ...p, name: e.target.value }))}
                          className="rounded border px-2 py-1 text-sm w-32"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          value={editOrg.slug}
                          onChange={(e) => setEditOrg((p) => ({ ...p, slug: e.target.value }))}
                          className="rounded border px-2 py-1 text-sm w-32 font-mono"
                        />
                      </td>
                      <td className="p-3">{stats.memberCount[o.id] ?? 0}</td>
                      <td className="p-3">{stats.toolCount[o.id] ?? 0}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={saveOrg} disabled={savingOrg} className="text-primary text-xs">Save</button>
                          <button onClick={() => setEditingOrg(null)} className="text-muted-foreground text-xs">Cancel</button>
                          <button
                            type="button"
                            onClick={() => { setEditingOrg(null); deleteOrg(o.id); }}
                            disabled={!!deletingOrgId}
                            className="text-destructive text-xs disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">{o.name}</td>
                      <td className="p-3 font-mono text-xs">{o.slug}</td>
                      <td className="p-3">{stats.memberCount[o.id] ?? 0}</td>
                      <td className="p-3">{stats.toolCount[o.id] ?? 0}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => startEditOrg(o)} className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Edit organization">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteOrg(o.id)}
                            disabled={!!deletingOrgId}
                            className="rounded p-2 text-destructive/80 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                            title="Delete organization"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Users ({users.length})</h2>
          <button
            type="button"
            onClick={() => setShowCreateUser(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create user
          </button>
        </div>
        {showCreateUser && (
          <div className="mt-3 rounded-lg border bg-muted/30 p-4">
            <h3 className="text-sm font-medium mb-2">New user</h3>
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                className="rounded border px-3 py-2 text-sm w-48"
              />
              <input
                type="password"
                placeholder="Password (min 6 chars)"
                value={newUser.password}
                onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
                className="rounded border px-3 py-2 text-sm w-40"
              />
              <select
                value={newUser.org_id}
                onChange={(e) => setNewUser((p) => ({ ...p, org_id: e.target.value }))}
                className="rounded border px-3 py-2 text-sm w-40"
              >
                <option value="">No org</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
                className="rounded border px-3 py-2 text-sm w-24"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <button onClick={createUser} disabled={creatingUser || !newUser.email || newUser.password.length < 6} className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50">
                {creatingUser ? 'Creating…' : 'Create'}
              </button>
              <button onClick={() => setShowCreateUser(false)} className="rounded border px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
        <div className="mt-2 overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Organizations</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-3">
                    <span>{u.email ?? u.id}</span>
                    {!u.email_confirmed_at && (
                      <span className="ml-2 inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Pending (unconfirmed)
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {(membersByUser[u.id] ?? []).map((m) => (
                      <span key={m.org_id} className="mr-2 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                        {orgById[m.org_id]?.name ?? m.org_id}
                        <select
                          value={m.role === 'owner' ? 'admin' : m.role}
                          onChange={(e) => updateRole(u.id, m.org_id, e.target.value)}
                          disabled={!!assigning}
                          className="ml-1 rounded border-0 bg-transparent text-xs py-0"
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => unassign(u.id, m.org_id)}
                          disabled={!!assigning}
                          className="text-destructive hover:underline"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAssignModalUserId(u.id);
                          setNewAssign({ user_id: u.id, org_id: '', role: 'member' });
                        }}
                        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Add user to organization"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSetPasswordUserId(u.id)}
                        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Set new password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => sendResetLink(u.id)}
                        disabled={!!loadingResetLink}
                        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                        title="Generate password reset link to copy"
                      >
                        <Link2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUser(u.id)}
                        disabled={!!deletingUserId}
                        className="rounded p-2 text-destructive/80 hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Set password modal */}
      {setPasswordUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg">
            <h3 className="font-semibold text-foreground">Set new password</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {users.find((u) => u.id === setPasswordUserId)?.email ?? setPasswordUserId}
            </p>
            <input
              type="password"
              placeholder="New password (min 6 chars)"
              value={setPasswordValue}
              onChange={(e) => setSetPasswordValue(e.target.value)}
              minLength={6}
              className="mt-3 w-full rounded border border-input bg-background px-3 py-2 text-sm"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={saveNewPassword}
                disabled={savingPassword || setPasswordValue.length < 6}
                className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                {savingPassword ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => { setSetPasswordUserId(null); setSetPasswordValue(''); }}
                className="rounded border border-input px-3 py-1.5 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset link modal */}
      {resetLinkResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-4 shadow-lg">
            <h3 className="font-semibold text-foreground">Password reset link</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Copy this link and send it to {resetLinkResult.email || 'the user'}.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                readOnly
                value={resetLinkResult.link}
                className="flex-1 rounded border border-input bg-muted/50 px-3 py-2 text-xs"
              />
              <button
                type="button"
                onClick={copyResetLink}
                className="inline-flex items-center gap-1 rounded bg-primary px-3 py-2 text-sm text-primary-foreground hover:opacity-90"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
            <button
              type="button"
              onClick={() => setResetLinkResult(null)}
              className="mt-4 rounded border border-input px-3 py-1.5 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add user to organization modal */}
      {assignModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAssignModalUserId(null)}>
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground">Add user to organization</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {userById[assignModalUserId]?.email ?? assignModalUserId}
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Organization</label>
                <select
                  value={newAssign.org_id}
                  onChange={(e) => setNewAssign((p) => ({ ...p, org_id: e.target.value }))}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select org</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newAssign.role}
                  onChange={(e) => setNewAssign((p) => ({ ...p, role: e.target.value }))}
                  className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            {message?.type === 'error' && message.text.includes('assign') && (
              <p className="mt-2 text-sm text-destructive">{message.text}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAssignModalUserId(null)}
                className="rounded border border-input px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={assign}
                disabled={!newAssign.org_id || !!assigning}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {assigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
