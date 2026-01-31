'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string | null;
  created_at: string;
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
  const [newOrg, setNewOrg] = useState({ name: '', slug: '', owner_id: '' });
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [editingOrg, setEditingOrg] = useState<string | null>(null);
  const [editOrg, setEditOrg] = useState({ name: '', slug: '' });
  const [savingOrg, setSavingOrg] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', org_id: '', role: 'member' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
          owner_id: newOrg.owner_id || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrgs((prev) => [...prev, data.org]);
        setShowCreateOrg(false);
        setNewOrg({ name: '', slug: '', owner_id: '' });
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
                value={newOrg.owner_id}
                onChange={(e) => setNewOrg((p) => ({ ...p, owner_id: e.target.value }))}
                className="rounded border px-3 py-2 text-sm w-48"
              >
                <option value="">No owner (add later)</option>
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
                <th className="p-3 text-left"></th>
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
                      <td className="p-3">
                        <button onClick={saveOrg} disabled={savingOrg} className="text-primary text-xs">Save</button>
                        <button onClick={() => setEditingOrg(null)} className="ml-2 text-muted-foreground text-xs">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-3">{o.name}</td>
                      <td className="p-3 font-mono text-xs">{o.slug}</td>
                      <td className="p-3">{stats.memberCount[o.id] ?? 0}</td>
                      <td className="p-3">{stats.toolCount[o.id] ?? 0}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => startEditOrg(o)} className="text-muted-foreground hover:text-foreground" title="Edit">
                          <Pencil className="h-4 w-4" />
                        </button>
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
                <option value="owner">Owner</option>
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
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-3">{u.email ?? u.id}</td>
                  <td className="p-3">
                    {(membersByUser[u.id] ?? []).map((m) => (
                      <span key={m.org_id} className="mr-2 inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs">
                        {orgById[m.org_id]?.name ?? m.org_id}
                        <select
                          value={m.role}
                          onChange={(e) => updateRole(u.id, m.org_id, e.target.value)}
                          disabled={!!assigning}
                          className="ml-1 rounded border-0 bg-transparent text-xs py-0"
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                          <option value="owner">owner</option>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Assign user to organization</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <select
            value={newAssign.user_id}
            onChange={(e) => setNewAssign((p) => ({ ...p, user_id: e.target.value }))}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">Select user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.email ?? u.id}</option>
            ))}
          </select>
          <select
            value={newAssign.org_id}
            onChange={(e) => setNewAssign((p) => ({ ...p, org_id: e.target.value }))}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">Select org</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select
            value={newAssign.role}
            onChange={(e) => setNewAssign((p) => ({ ...p, role: e.target.value }))}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <button
            type="button"
            onClick={assign}
            disabled={!newAssign.user_id || !newAssign.org_id || !!assigning}
            className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Assign
          </button>
        </div>
      </section>
    </div>
  );
}
