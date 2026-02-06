'use client';

import { useEffect, useState, useCallback } from 'react';
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
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Download,
  RefreshCw,
  Link as LinkIcon,
  FileUp,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { ServiceAreaMapDrawer, type PolygonCoords } from '@/components/ServiceAreaMapDrawer';
import { normalizeServiceAreaPolygons } from '@/lib/service-area/normalizePolygons';

interface ServiceAreaItem {
  id: string;
  name: string;
  pointCount: number;
  networkLinkUrl?: string;
  hasPolygon: boolean;
}

export default function ServiceAreasClient() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [list, setList] = useState<ServiceAreaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const [importKmlModalOpen, setImportKmlModalOpen] = useState(false);
  const [importLinkModalOpen, setImportLinkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPolygons, setEditPolygons] = useState<PolygonCoords[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importName, setImportName] = useState('');
  const [importKmlFile, setImportKmlFile] = useState<File | null>(null);
  const [importLinkUrl, setImportLinkUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadList = useCallback(() => {
    if (!orgId) return;
    fetch(`/api/dashboard/orgs/${orgId}/service-areas`)
      .then((r) => r.json())
      .then((d) => setList(d.serviceAreas ?? []))
      .catch(() => setList([]));
  }, [orgId]);

  useEffect(() => {
    fetch('/api/dashboard/orgs/selected')
      .then((r) => r.json())
      .then((d) => {
        setOrgId(d.org?.id ?? null);
        return d.org?.id;
      })
      .then((id) => {
        if (id) return fetch(`/api/dashboard/orgs/${id}/service-areas`).then((r) => r.json());
        return { serviceAreas: [] };
      })
      .then((d) => setList(d.serviceAreas ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (orgId) loadList();
  }, [orgId, loadList]);

  const openDrawModal = (areaId?: string) => {
    setEditingId(areaId ?? null);
    setEditName('');
    setEditPolygons(null);
    if (areaId) {
      fetch(`/api/dashboard/orgs/${orgId}/service-areas/${areaId}`)
        .then((r) => r.json())
        .then((d) => {
          setEditName(d.serviceArea?.name ?? '');
          const list = normalizeServiceAreaPolygons(d.serviceArea?.polygon);
          setEditPolygons(list.length > 0 ? list : null);
        })
        .catch(() => {});
    }
    setDrawModalOpen(true);
  };

  const saveDraw = async () => {
    if (!orgId || !editName.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const url = editingId
        ? `/api/dashboard/orgs/${orgId}/service-areas/${editingId}`
        : `/api/dashboard/orgs/${orgId}/service-areas`;
      const method = editingId ? 'PATCH' : 'POST';
      const polygons = editPolygons ?? [];
      const body = editingId
        ? { name: editName.trim(), polygon: polygons.length > 0 ? polygons : undefined }
        : { name: editName.trim(), polygon: polygons };
      const hasValidPolygon = polygons.some((p) => p.length >= 3);
      if (!editingId && !hasValidPolygon) {
        setMessage({ type: 'error', text: 'Draw at least one polygon with 3+ points.' });
        setSaving(false);
        return;
      }
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: editingId ? 'Service area updated.' : 'Service area created.' });
        setDrawModalOpen(false);
        loadList();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to save.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const importFromKml = async () => {
    if (!orgId || !importName.trim() || !importKmlFile) return;
    setImporting(true);
    setMessage(null);
    try {
      const text = await importKmlFile.text();
      const res = await fetch(`/api/dashboard/orgs/${orgId}/service-areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: importName.trim(), kmlContent: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Service area created from KML.' });
        setImportKmlModalOpen(false);
        setImportName('');
        setImportKmlFile(null);
        loadList();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Import failed.' });
      }
    } finally {
      setImporting(false);
    }
  };

  const importFromLink = async () => {
    if (!orgId || !importName.trim() || !importLinkUrl.trim()) return;
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}/service-areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: importName.trim(), network_link_url: importLinkUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Service area created from link.' });
        setImportLinkModalOpen(false);
        setImportName('');
        setImportLinkUrl('');
        loadList();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Import failed.' });
      }
    } finally {
      setImporting(false);
    }
  };

  const deleteArea = async (areaId: string) => {
    if (!orgId || !confirm('Delete this service area? Tools using it will no longer have this area assigned.')) return;
    const res = await fetch(`/api/dashboard/orgs/${orgId}/service-areas/${areaId}`, { method: 'DELETE' });
    if (res.ok) loadList();
  };

  const refreshFromLink = async (areaId: string) => {
    if (!orgId) return;
    setRefreshingId(areaId);
    try {
      const res = await fetch(`/api/dashboard/orgs/${orgId}/service-areas/${areaId}/refresh-from-link`, {
        method: 'POST',
      });
      if (res.ok) loadList();
    } finally {
      setRefreshingId(null);
    }
  };

  const downloadKml = (areaId: string, name: string) => {
    const url = `/api/dashboard/orgs/${orgId}/service-areas/${areaId}/download-kml`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(name || 'service-area').replace(/[^\w\s-]/g, '')}.kml`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          Service areas
        </h1>
        <p className="text-muted-foreground mt-1">
          Define service areas for your organization and assign them to tools. Draw on the map, or import from a KML file or network link.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}
        >
          {message.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => openDrawModal()} variant="default" className="gap-2">
          <Plus className="h-4 w-4" />
          Draw new area
        </Button>
        <Button onClick={() => { setImportName(''); setImportKmlFile(null); setImportKmlModalOpen(true); }} variant="outline" className="gap-2">
          <FileUp className="h-4 w-4" />
          Import from KML file
        </Button>
        <Button onClick={() => { setImportName(''); setImportLinkUrl(''); setImportLinkModalOpen(true); }} variant="outline" className="gap-2">
          <LinkIcon className="h-4 w-4" />
          Import from network link
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your service areas</CardTitle>
          <CardDescription>Assign these to tools in each tool&apos;s Settings → Service area.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-muted-foreground py-6">No service areas yet. Draw one or import from KML.</p>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((area) => (
                <li key={area.id} className="py-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{area.name}</span>
                    <span className="text-muted-foreground text-sm ml-2">
                      {area.pointCount} points
                      {area.networkLinkUrl && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 text-xs">
                          Updates from link
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {area.networkLinkUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refreshFromLink(area.id)}
                        disabled={refreshingId === area.id}
                        className="gap-1"
                      >
                        {refreshingId === area.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Refresh from link
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => downloadKml(area.id, area.name)} className="gap-1">
                      <Download className="h-3.5 w-3.5" />
                      Download KML
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openDrawModal(area.id)} className="gap-1">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteArea(area.id)} className="gap-1 text-destructive hover:text-destructive">
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

      {/* Draw / Edit modal */}
      <Dialog open={drawModalOpen} onOpenChange={setDrawModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit service area' : 'Draw new service area'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Adjust the polygons or name below. Use the map toolbar to add more zones.'
                : 'Draw one or more zones on the map. Click to add points; close the shape to finish. Use the polygon tool to add another zone.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="draw-name">Name</Label>
              <Input
                id="draw-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Downtown zone"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Map</Label>
              <p className="text-sm text-muted-foreground mb-1">Draw or edit polygons. Each closed shape is one zone; you can add multiple zones.</p>
              <div className="mt-1 rounded-lg overflow-hidden border border-border">
                <ServiceAreaMapDrawer
                  initialPolygon={editPolygons ?? undefined}
                  onPolygonChange={(p) => {
                    if (!p) setEditPolygons(null);
                    else if (Array.isArray(p) && p.length > 0 && Array.isArray(p[0]) && p[0].length >= 3) {
                      setEditPolygons(p as PolygonCoords[]);
                    } else {
                      setEditPolygons([p as PolygonCoords]);
                    }
                  }}
                  height={360}
                />
              </div>
            </div>
          </div>
          {message?.type && (
            <p className={message.type === 'success' ? 'text-emerald-600 text-sm' : 'text-destructive text-sm'}>
              {message.text}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDrawModalOpen(false)}>Cancel</Button>
            <Button onClick={saveDraw} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {editingId ? 'Save changes' : 'Create area'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import KML file modal */}
      <Dialog open={importKmlModalOpen} onOpenChange={setImportKmlModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from KML file</DialogTitle>
            <DialogDescription>Upload a .kml file containing a polygon. You can then edit it in the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="import-name">Name</Label>
              <Input
                id="import-name"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="e.g. Imported zone"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="kml-file">KML file</Label>
              <Input
                id="kml-file"
                type="file"
                accept=".kml"
                onChange={(e) => setImportKmlFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportKmlModalOpen(false)}>Cancel</Button>
            <Button onClick={importFromKml} disabled={importing || !importName.trim() || !importKmlFile}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import network link modal */}
      <Dialog open={importLinkModalOpen} onOpenChange={setImportLinkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from network link</DialogTitle>
            <DialogDescription>Paste a URL to a KML file (e.g. from Google My Maps). We&apos;ll fetch it and keep the area up to date. You can also edit it in the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="link-name">Name</Label>
              <Input
                id="link-name"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="e.g. My Maps area"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="link-url">KML or Network Link URL</Label>
              <Input
                id="link-url"
                type="url"
                value={importLinkUrl}
                onChange={(e) => setImportLinkUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportLinkModalOpen(false)}>Cancel</Button>
            <Button onClick={importFromLink} disabled={importing || !importName.trim() || !importLinkUrl.trim()}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
