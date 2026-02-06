'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Loader2, DollarSign, Sparkles, Settings } from 'lucide-react';

interface PricingStructureItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ToolAssignment {
  id: string;
  name: string;
  pricingStructureId: string | null;
}

export default function PricingStructuresClient() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [list, setList] = useState<PricingStructureItem[]>([]);
  const [tools, setTools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [copyFromToolId, setCopyFromToolId] = useState('');
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toolAssignments, setToolAssignments] = useState<ToolAssignment[]>([]);
  const [savingToolId, setSavingToolId] = useState<string | null>(null);
  const [assignmentMessage, setAssignmentMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadList = useCallback(() => {
    if (!orgId) return;
    fetch(`/api/dashboard/orgs/${orgId}/pricing-structures`)
      .then((r) => r.json())
      .then((d) => setList(d.pricingStructures ?? []))
      .catch(() => setList([]));
  }, [orgId]);

  const loadTools = useCallback(() => {
    if (!orgId) return;
    fetch(`/api/dashboard/orgs/${orgId}/tools`)
      .then((r) => r.json())
      .then((d) => setTools(d.tools ?? []))
      .catch(() => setTools([]));
  }, [orgId]);

  const loadToolAssignments = useCallback(() => {
    if (!orgId) return;
    fetch(`/api/dashboard/orgs/${orgId}/tools-pricing-assignments`)
      .then((r) => r.json())
      .then((d) => setToolAssignments(d.tools ?? []))
      .catch(() => setToolAssignments([]));
  }, [orgId]);

  useEffect(() => {
    fetch('/api/dashboard/orgs/selected')
      .then((r) => r.json())
      .then((d) => {
        setOrgId(d.org?.id ?? null);
        setOrgRole(d.org?.role ?? null);
        return d.org?.id;
      })
      .then((id) => {
        if (id) {
          loadList();
          loadTools();
          loadToolAssignments();
        }
      })
      .finally(() => setLoading(false));
  }, [loadList, loadTools, loadToolAssignments]);

  useEffect(() => {
    if (!orgId) return;
    loadList();
    loadToolAssignments();
  }, [orgId, loadList, loadToolAssignments]);

  const [toolSelection, setToolSelection] = useState<Record<string, string>>({});
  const getToolStructureId = (toolId: string) => toolSelection[toolId] ?? toolAssignments.find((t) => t.id === toolId)?.pricingStructureId ?? '';
  const setToolStructureId = (toolId: string, value: string) => setToolSelection((prev) => ({ ...prev, [toolId]: value }));

  const saveToolAssignment = async (toolId: string) => {
    setSavingToolId(toolId);
    setAssignmentMessage(null);
    const value = getToolStructureId(toolId) || null;
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/pricing-structures`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricingStructureId: value }),
      });
      if (res.ok) {
        setToolAssignments((prev) => prev.map((t) => (t.id === toolId ? { ...t, pricingStructureId: value } : t)));
        setToolSelection((prev) => { const next = { ...prev }; delete next[toolId]; return next; });
        setAssignmentMessage({ type: 'success', text: 'Assignment saved.' });
      } else {
        const data = await res.json();
        setAssignmentMessage({ type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setAssignmentMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSavingToolId(null);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      const body: { name: string; copyFromToolId?: string } = { name };
      if (copyFromToolId) body.copyFromToolId = copyFromToolId;
      const res = await fetch(`/api/dashboard/orgs/${orgId}/pricing-structures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateOpen(false);
        setNewName('');
        setCopyFromToolId('');
        loadList();
        setMessage({ type: 'success', text: `"${data.pricingStructure?.name ?? name}" created.` });
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to create' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to create pricing structure' });
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editId || !orgId) return;
    const name = editName.trim();
    if (!name) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }
    setSavingEdit(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}/pricing-structures/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setEditId(null);
        setEditName('');
        loadList();
        setMessage({ type: 'success', text: 'Name updated.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error ?? 'Failed to update' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update' });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || !orgId) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}/pricing-structures/${deleteId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteId(null);
        loadList();
        setMessage({ type: 'success', text: 'Pricing structure removed.' });
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error ?? 'Failed to delete' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete' });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Select an organization to manage pricing structures.</p>
        </CardContent>
      </Card>
    );
  }

  if (orgRole !== 'admin') {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Only org admins can manage pricing structures.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Structures
          </CardTitle>
          <CardDescription>
            Create and name pricing structures. Build multiple structures below; assign which one each tool uses in Pricing structure assignment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <p className={message.type === 'success' ? 'text-sm text-green-600' : 'text-sm text-destructive'}>
              {message.text}
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={() => { setCreateOpen(true); setMessage(null); }} className="gap-2">
              <Plus className="h-4 w-4" />
              New pricing structure
            </Button>
          </div>
          {list.length === 0 ? (
            <p className="text-muted-foreground py-4">No pricing structures yet. Create one to get started.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {list.map((ps) => (
                <li key={ps.id} className="flex items-center justify-between px-4 py-3">
                  <span className="font-medium">{ps.name}</span>
                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/dashboard/pricing-structures/${ps.id}/edit`}>
                      <Button variant="default" size="sm" className="gap-1">
                        <Sparkles className="h-3.5 w-3.5" />
                        Build / Edit
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setEditId(ps.id); setEditName(ps.name); setMessage(null); }}
                      className="gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit name
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDeleteId(ps.id); setMessage(null); }}
                      className="gap-1 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Assign pricing structure to tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pricing structure assignment
          </CardTitle>
          <CardDescription>
            Choose which pricing structure each tool uses for quotes. Create structures above, then assign them here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignmentMessage && (
            <p className={assignmentMessage.type === 'success' ? 'text-sm text-green-600 dark:text-green-400' : 'text-sm text-destructive'}>
              {assignmentMessage.text}
            </p>
          )}
          {toolAssignments.length === 0 ? (
            <p className="text-muted-foreground py-2">No tools in this organization yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {toolAssignments.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <span className="font-medium">{t.name}</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={getToolStructureId(t.id)}
                      onChange={(e) => setToolStructureId(t.id, e.target.value)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
                    >
                      <option value="">Tool default pricing</option>
                      {list.map((ps) => (
                        <option key={ps.id} value={ps.id}>{ps.name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => saveToolAssignment(t.id)}
                      disabled={savingToolId === t.id}
                      className="gap-1"
                    >
                      {savingToolId === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Save
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New pricing structure</DialogTitle>
            <DialogDescription>Give it a name. Optionally copy pricing from one of your tools.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Standard, Premium"
                className="mt-1"
              />
            </div>
            {tools.length > 0 && (
              <div>
                <Label htmlFor="copy-tool">Copy pricing from tool (optional)</Label>
                <select
                  id="copy-tool"
                  value={copyFromToolId}
                  onChange={(e) => setCopyFromToolId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">None — start empty</option>
                  {tools.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit name dialog */}
      <Dialog open={!!editId} onOpenChange={(open) => { if (!open) { setEditId(null); setEditName(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit name</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditId(null); setEditName(''); }} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete pricing structure?</DialogTitle>
            <DialogDescription>
              Tools using this structure will fall back to their default pricing. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
