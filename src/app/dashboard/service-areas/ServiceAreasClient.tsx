'use client';

import { useEffect, useState, useCallback } from 'react';
import { useDashboardApi } from '@/lib/dashboard-api';
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
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { ServiceAreaMapDrawer, DEFAULT_ZONE_COLORS_6, type PolygonCoords, type ZoneDisplayItem } from '@/components/ServiceAreaMapDrawer';
import { normalizeServiceAreaPolygons } from '@/lib/service-area/normalizePolygons';

interface ServiceAreaItem {
  id: string;
  name: string;
  pointCount: number;
  networkLinkUrl?: string;
  hasPolygon: boolean;
}

export default function ServiceAreasClient() {
  const { api } = useDashboardApi();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<string | null>(null);
  const [orgOfficeAddress, setOrgOfficeAddress] = useState<string>('');
  const [list, setList] = useState<ServiceAreaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawModalOpen, setDrawModalOpen] = useState(false);
  const [importKmlModalOpen, setImportKmlModalOpen] = useState(false);
  const [importLinkModalOpen, setImportLinkModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPolygons, setEditPolygons] = useState<PolygonCoords[] | null>(null);
  const [editZoneDisplay, setEditZoneDisplay] = useState<ZoneDisplayItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importName, setImportName] = useState('');
  const [importKmlFile, setImportKmlFile] = useState<File | null>(null);
  const [importLinkUrl, setImportLinkUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importZipCsvModalOpen, setImportZipCsvModalOpen] = useState(false);
  const [importZipCsvFile, setImportZipCsvFile] = useState<File | null>(null);
  const [singleZipModalOpen, setSingleZipModalOpen] = useState(false);
  const [singleZipName, setSingleZipName] = useState('');
  const [singleZipCode, setSingleZipCode] = useState('');
  const [singleZipCreating, setSingleZipCreating] = useState(false);
  const [addZipInput, setAddZipInput] = useState('');
  const [addZipLoading, setAddZipLoading] = useState(false);
  const [addZipError, setAddZipError] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewName, setPreviewName] = useState('');
  const [previewPolygons, setPreviewPolygons] = useState<PolygonCoords[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  /** Stable initial data for the map drawer (set when modal opens / fetch completes). Not updated on draw, so the map does not re-init and blank. */
  const [initialPolygonForDrawer, setInitialPolygonForDrawer] = useState<PolygonCoords[] | null>(null);
  const [initialZoneDisplayForDrawer, setInitialZoneDisplayForDrawer] = useState<ZoneDisplayItem[]>([]);

  const loadList = useCallback(() => {
    if (!orgId) return;
    api(`/api/dashboard/orgs/${orgId}/service-areas`)
      .then((r) => r.json())
      .then((d) => setList(d.serviceAreas ?? []))
      .catch(() => setList([]));
  }, [orgId, api]);

  useEffect(() => {
    api('/api/dashboard/orgs/selected')
      .then((r) => r.json())
      .then((d) => {
        setOrgId(d.org?.id ?? null);
        setOrgRole(d.org?.role ?? null);
        setOrgOfficeAddress((d.org as { office_address?: string } | null)?.office_address ?? '');
        return d.org?.id && (d.org?.role === 'admin') ? d.org.id : null;
      })
      .then((id) => {
        if (id) return api(`/api/dashboard/orgs/${id}/service-areas`).then((r) => r.json());
        return { serviceAreas: [] };
      })
      .then((d) => setList(d.serviceAreas ?? []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    if (orgId) loadList();
  }, [orgId, loadList]);

  const openDrawModal = (areaId?: string) => {
    setEditingId(areaId ?? null);
    setEditName('');
    setEditPolygons(null);
    setEditZoneDisplay([]);
    setInitialPolygonForDrawer(null);
    setInitialZoneDisplayForDrawer([]);
    setAddZipInput('');
    setAddZipError(null);
    if (areaId) {
      api(`/api/dashboard/orgs/${orgId}/service-areas/${areaId}`)
        .then((r) => r.json())
        .then((d) => {
          setEditName(d.serviceArea?.name ?? '');
          const list = normalizeServiceAreaPolygons(d.serviceArea?.polygon);
          setEditPolygons(list.length > 0 ? list : null);
          const zd = d.serviceArea?.zone_display;
          const zoneList = Array.isArray(zd) ? zd.map((z: { label?: string; color?: string }) => ({ label: z?.label ?? '', color: z?.color ?? '' })) : [];
          const display = list.length > 0 ? Array.from({ length: list.length }, (_, i) => {
            const z = zoneList[i] ?? { label: '', color: '' };
            const color = (z.color && /^#[0-9A-Fa-f]{6}$/.test(z.color)) ? z.color : DEFAULT_ZONE_COLORS_6[i % DEFAULT_ZONE_COLORS_6.length];
            return { label: z.label ?? '', color };
          }) : [];
          setEditZoneDisplay(display);
          setInitialPolygonForDrawer(list.length > 0 ? list : null);
          setInitialZoneDisplayForDrawer(display);
        })
        .catch(() => {});
    }
    setDrawModalOpen(true);
  };

  const [previewZoneDisplay, setPreviewZoneDisplay] = useState<ZoneDisplayItem[]>([]);

  const openPreview = (areaId: string) => {
    setPreviewOpen(true);
    setPreviewName('');
    setPreviewPolygons(null);
    setPreviewZoneDisplay([]);
    setPreviewLoading(true);
    api(`/api/dashboard/orgs/${orgId}/service-areas/${areaId}`)
      .then((r) => r.json())
      .then((d) => {
        setPreviewName(d.serviceArea?.name ?? 'Service area');
        const list = normalizeServiceAreaPolygons(d.serviceArea?.polygon);
        setPreviewPolygons(list.length > 0 ? list : null);
        const zd = d.serviceArea?.zone_display;
        setPreviewZoneDisplay(Array.isArray(zd) ? zd : []);
      })
      .catch(() => {})
      .finally(() => setPreviewLoading(false));
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
      const zoneDisplay = polygons.length > 0
        ? Array.from({ length: polygons.length }, (_, i) => ({
            label: (editZoneDisplay[i]?.label ?? '').trim() || undefined,
            color: (editZoneDisplay[i]?.color ?? '').trim() || undefined,
          }))
        : [];
      const body = editingId
        ? { name: editName.trim(), polygon: polygons.length > 0 ? polygons : undefined, zone_display: zoneDisplay }
        : { name: editName.trim(), polygon: polygons, zone_display: zoneDisplay };
      const hasValidPolygon = polygons.some((p) => p.length >= 3);
      if (!editingId && !hasValidPolygon) {
        setMessage({ type: 'error', text: 'Draw at least one polygon with 3+ points.' });
        setSaving(false);
        return;
      }
      const res = await api(url, {
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
      const res = await api(`/api/dashboard/orgs/${orgId}/service-areas`, {
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
      const res = await api(`/api/dashboard/orgs/${orgId}/service-areas`, {
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

  const importFromZipCsv = async () => {
    if (!orgId || !importName.trim() || !importZipCsvFile) return;
    setImporting(true);
    setMessage(null);
    try {
      const csvText = await importZipCsvFile.text();
      const res = await api(`/api/dashboard/orgs/${orgId}/service-areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: importName.trim(), zipCsvContent: csvText }),
      });
      const data = await res.json();
      if (res.ok) {
        const summary = data.zipSummary;
        const msg = summary
          ? `Service area created from ${summary.created} ZIP code(s).${summary.failed > 0 ? ` (${summary.failed} could not be loaded.)` : ''}`
          : 'Service area created from ZIP codes.';
        setMessage({ type: 'success', text: msg });
        setImportZipCsvModalOpen(false);
        setImportName('');
        setImportZipCsvFile(null);
        loadList();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Import failed.' });
      }
    } finally {
      setImporting(false);
    }
  };

  const addZipToMap = async () => {
    const zip5 = addZipInput.trim().replace(/\D/g, '').slice(0, 5);
    if (!orgId || zip5.length !== 5) return;
    setAddZipLoading(true);
    setAddZipError(null);
    try {
      const res = await api(`/api/dashboard/orgs/${orgId}/service-areas/zip-to-polygon?zip=${encodeURIComponent(zip5)}`);
      const data = await res.json();
      if (res.ok && data.polygon) {
        setEditPolygons((prev) => {
          const next = [...(prev ?? []), data.polygon];
          setInitialPolygonForDrawer(next);
          return next;
        });
        setEditZoneDisplay((prev) => {
          const next = [...prev, { label: zip5, color: DEFAULT_ZONE_COLORS_6[prev.length % DEFAULT_ZONE_COLORS_6.length] }];
          setInitialZoneDisplayForDrawer(next);
          return next;
        });
        setAddZipInput('');
      } else {
        setAddZipError(data.error ?? 'Could not load ZIP boundary.');
      }
    } catch {
      setAddZipError('Failed to load ZIP boundary.');
    } finally {
      setAddZipLoading(false);
    }
  };

  const createFromSingleZip = async () => {
    const zip5 = singleZipCode.trim().replace(/^(\d{5}).*/, '$1');
    if (!orgId || !singleZipName.trim() || !/^\d{5}$/.test(zip5)) return;
    setSingleZipCreating(true);
    setMessage(null);
    try {
      const res = await api(`/api/dashboard/orgs/${orgId}/service-areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: singleZipName.trim(), zipCodes: [zip5] }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Service area "${singleZipName.trim()}" created from ZIP ${zip5}.` });
        setSingleZipModalOpen(false);
        setSingleZipName('');
        setSingleZipCode('');
        loadList();
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Could not create area from ZIP.' });
      }
    } finally {
      setSingleZipCreating(false);
    }
  };

  const deleteArea = async (areaId: string) => {
    if (!orgId || !confirm('Delete this service area? Tools using it will no longer have this area assigned.')) return;
    const res = await api(`/api/dashboard/orgs/${orgId}/service-areas/${areaId}`, { method: 'DELETE' });
    if (res.ok) loadList();
  };

  const refreshFromLink = async (areaId: string) => {
    if (!orgId) return;
    setRefreshingId(areaId);
    try {
      const res = await api(`/api/dashboard/orgs/${orgId}/service-areas/${areaId}/refresh-from-link`, {
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

  if (orgRole !== 'admin') {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Only org admins can manage service areas.</p>
        </CardContent>
      </Card>
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
          Define service areas for your organization and assign them to tools. Enter a ZIP code to auto-map its boundary, draw on the map, or import from KML or CSV.
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
        <Button onClick={() => { setSingleZipName(''); setSingleZipCode(''); setSingleZipModalOpen(true); }} variant="default" className="gap-2">
          <MapPin className="h-4 w-4" />
          Add by ZIP code
        </Button>
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
        <Button onClick={() => { setImportName(''); setImportZipCsvFile(null); setImportZipCsvModalOpen(true); }} variant="outline" className="gap-2">
          <FileUp className="h-4 w-4" />
          Import from ZIP code CSV
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
                <li key={area.id} className="py-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
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
                  <div className="flex flex-wrap items-center gap-2">
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
                    {area.hasPolygon && (
                      <Button variant="ghost" size="sm" onClick={() => openPreview(area.id)} className="gap-1" title="Preview map">
                        <Eye className="h-3.5 w-3.5" />
                        Preview
                      </Button>
                    )}
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

      {/* Preview map modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-y-auto sm:max-w-[min(90vw,1200px)]">
          <DialogHeader>
            <DialogTitle>Preview: {previewName || 'Service area'}</DialogTitle>
            <DialogDescription>Map view of the service area. No editing.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-lg overflow-hidden border border-border min-h-[60vh]">
            {previewLoading ? (
              <div className="flex items-center justify-center py-24 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : previewPolygons && previewPolygons.length > 0 ? (
              <ServiceAreaMapDrawer
                initialPolygon={previewPolygons}
                zoneDisplay={previewZoneDisplay.length > 0 ? previewZoneDisplay : undefined}
                readOnly
                height="65vh"
                officeAddress={orgOfficeAddress || undefined}
              />
            ) : (
              <div className="py-24 text-center text-muted-foreground">
                No polygon data to show.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draw / Edit modal */}
      <Dialog open={drawModalOpen} onOpenChange={setDrawModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit service area' : 'Draw new service area'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Adjust the polygons or name below. Add ZIP codes to include their boundaries, or use the map toolbar to draw more zones.'
                : 'Draw zones on the map and/or add ZIP codes to include their boundaries. All zones stay on the same map.'}
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
            <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex-1 min-w-[140px]">
                <Label htmlFor="add-zip-draw" className="text-sm font-medium">Add zone from ZIP code</Label>
                <Input
                  id="add-zip-draw"
                  value={addZipInput}
                  onChange={(e) => { setAddZipInput(e.target.value.replace(/\D/g, '').slice(0, 5)); setAddZipError(null); }}
                  placeholder="e.g. 27601"
                  maxLength={5}
                  className="mt-1 w-28 font-mono"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addZipToMap}
                disabled={addZipLoading || addZipInput.trim().length !== 5}
              >
                {addZipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add ZIP to map
              </Button>
              {addZipError && <p className="text-sm text-destructive w-full">{addZipError}</p>}
              <p className="text-xs text-muted-foreground w-full">Enter a US 5-digit ZIP to add its boundary as another zone on this map. You can mix drawn polygons and ZIPs.</p>
            </div>
            <div>
              <Label>Map</Label>
              <p className="text-sm text-muted-foreground mb-1">Draw or edit polygons. Each closed shape is one zone; you can add multiple zones.</p>
              <p className="text-sm font-medium text-primary mb-1">Click on the map to add points. Double-click or click the first point again to close the polygon.</p>
              <div className="mt-1 rounded-lg overflow-hidden border border-border">
                <ServiceAreaMapDrawer
                  initialPolygon={initialPolygonForDrawer ?? undefined}
                  zoneDisplay={initialZoneDisplayForDrawer.length ? initialZoneDisplayForDrawer : undefined}
                  officeAddress={orgOfficeAddress || undefined}
                  onPolygonChange={(p) => {
                    if (!p) {
                      setEditPolygons(null);
                      setEditZoneDisplay([]);
                    } else {
                      const list = Array.isArray(p) && p.length > 0 && Array.isArray(p[0]) && (p[0] as [number, number]).length >= 2
                        ? (p as PolygonCoords[])
                        : [p as PolygonCoords];
                      setEditPolygons(list);
                      setEditZoneDisplay((prev) => {
                        return list.map((_, i) => {
                          const existing = prev[i];
                          const color = (existing?.color && /^#[0-9A-Fa-f]{6}$/.test(existing.color)) ? existing.color : DEFAULT_ZONE_COLORS_6[i % DEFAULT_ZONE_COLORS_6.length];
                          return { label: existing?.label ?? '', color };
                        });
                      });
                    }
                  }}
                  height={360}
                />
              </div>
            </div>
            {(editPolygons?.length ?? 0) > 0 && (
              <div>
                <Label>Zone labels & colors</Label>
                <p className="text-sm text-muted-foreground mb-2">Customize the label and color for each zone on the map.</p>
                <ul className="space-y-3">
                  {Array.from({ length: editPolygons!.length }, (_, idx) => (
                    <li key={idx} className="flex flex-wrap items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                      <span className="text-sm font-medium w-14">Zone {idx + 1}</span>
                      <Input
                        placeholder="Label (e.g. Downtown)"
                        value={editZoneDisplay[idx]?.label ?? ''}
                        onChange={(e) => setEditZoneDisplay((prev) => {
                          const next = [...prev];
                          while (next.length <= idx) next.push({ label: '', color: DEFAULT_ZONE_COLORS_6[next.length % DEFAULT_ZONE_COLORS_6.length] });
                          next[idx] = { ...next[idx], label: e.target.value };
                          return next;
                        })}
                        className="flex-1 min-w-[120px] max-w-[200px]"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={(editZoneDisplay[idx]?.color && /^#[0-9A-Fa-f]{6}$/.test(editZoneDisplay[idx].color!)) ? editZoneDisplay[idx].color! : DEFAULT_ZONE_COLORS_6[idx % DEFAULT_ZONE_COLORS_6.length]}
                          onChange={(e) => setEditZoneDisplay((prev) => {
                            const next = [...prev];
                            while (next.length <= idx) next.push({ label: '', color: DEFAULT_ZONE_COLORS_6[next.length % DEFAULT_ZONE_COLORS_6.length] });
                            next[idx] = { ...next[idx], color: e.target.value };
                            return next;
                          })}
                          className="w-10 h-10 rounded border border-border cursor-pointer"
                          title="Zone color"
                        />
                        <Input
                          placeholder="#3b82f6"
                          value={editZoneDisplay[idx]?.color ?? ''}
                          onChange={(e) => setEditZoneDisplay((prev) => {
                            const next = [...prev];
                            while (next.length <= idx) next.push({ label: '', color: DEFAULT_ZONE_COLORS_6[next.length % DEFAULT_ZONE_COLORS_6.length] });
                            next[idx] = { ...next[idx], color: e.target.value };
                            return next;
                          })}
                          className="w-24 font-mono text-sm"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

      {/* Add by single ZIP code modal */}
      <Dialog open={singleZipModalOpen} onOpenChange={setSingleZipModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create service area from ZIP code</DialogTitle>
            <DialogDescription>
              Enter one US 5-digit ZIP code. We&apos;ll fetch its boundary from Census data and create a service area with that polygon. You can edit it later if needed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="singlezip-name">Service area name</Label>
              <Input
                id="singlezip-name"
                value={singleZipName}
                onChange={(e) => setSingleZipName(e.target.value)}
                placeholder="e.g. Raleigh 27601"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="singlezip-code">ZIP code</Label>
              <Input
                id="singlezip-code"
                value={singleZipCode}
                onChange={(e) => setSingleZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="27601"
                maxLength={5}
                className="mt-1 w-32 font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">5-digit US ZIP code. The boundary (ZCTA) will be loaded automatically.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSingleZipModalOpen(false)}>Cancel</Button>
            <Button
              onClick={createFromSingleZip}
              disabled={singleZipCreating || !singleZipName.trim() || singleZipCode.trim().length !== 5}
            >
              {singleZipCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from ZIP code CSV modal */}
      <Dialog open={importZipCsvModalOpen} onOpenChange={setImportZipCsvModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import from ZIP code CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing US 5-digit ZIP codes (one per row or in any column). We&apos;ll fetch each ZIP&apos;s boundary from Census data and create a service area with one zone per ZIP. Max 150 ZIPs per import.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="zipcsv-name">Service area name</Label>
              <Input
                id="zipcsv-name"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="e.g. Metro ZIPs"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="zipcsv-file">CSV file</Label>
              <Input
                id="zipcsv-file"
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(e) => setImportZipCsvFile(e.target.files?.[0] ?? null)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Any CSV or text file with 5-digit US ZIP codes (e.g. 90210, 10001).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportZipCsvModalOpen(false)}>Cancel</Button>
            <Button onClick={importFromZipCsv} disabled={importing || !importName.trim() || !importZipCsvFile}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Import ZIPs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
