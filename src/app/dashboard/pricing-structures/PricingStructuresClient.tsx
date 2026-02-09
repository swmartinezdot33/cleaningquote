'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboardApi } from '@/lib/dashboard-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react';

interface PricingStructureItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export default function PricingStructuresClient() {
  const { api, locationId: effectiveLocationId } = useDashboardApi();
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const loadList = useCallback(() => {
    if (!orgId) return;
    api(`/api/dashboard/orgs/${orgId}/pricing-structures`)
      .then((r) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PricingStructuresClient:listResponse', message: 'pricing-structures response', data: { status: r.status, ok: r.ok }, timestamp: Date.now(), hypothesisId: 'H2-H5' }) }).catch(() => {});
        // #endregion
        return r.json();
      })
      .then((d) => setList(d.pricingStructures ?? []))
      .catch(() => setList([]));
  }, [orgId, api]);

  const loadTools = useCallback(() => {
    if (!orgId) return;
    api(`/api/dashboard/orgs/${orgId}/tools`)
      .then((r) => r.json())
      .then((d) => setTools(d.tools ?? []))
      .catch(() => setTools([]));
  }, [orgId, api]);

  // Refetch selected org when locationId changes (api identity changes) so GHL location toggle updates without refresh.
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'PricingStructuresClient:effect', message: 'load effect run', data: { hasEffectiveLocationId: !!effectiveLocationId }, timestamp: Date.now(), hypothesisId: 'H1' }) }).catch(() => {});
    // #endregion
    api('/api/dashboard/orgs/selected')
      .then((r) => r.json())
      .then((d) => {
        setOrgId(d.org?.id ?? null);
        setOrgRole(d.org?.role ?? null);
      })
      .finally(() => setLoading(false));
  }, [api, effectiveLocationId]);

  useEffect(() => {
    if (!orgId) return;
    loadList();
  }, [orgId, loadList]);

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
      const res = await api(`/api/dashboard/orgs/${orgId}/pricing-structures`, {
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

  const handleDelete = async () => {
    if (!deleteId || !orgId) return;
    setDeleting(true);
    setMessage(null);
    try {
      const res = await api(`/api/dashboard/orgs/${orgId}/pricing-structures/${deleteId}`, {
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
        <CardContent className="pt-6 space-y-4">
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
