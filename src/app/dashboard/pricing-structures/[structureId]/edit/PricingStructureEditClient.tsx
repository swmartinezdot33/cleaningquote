'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useDashboardApi } from '@/lib/dashboard-api';
import {
  Upload,
  Save,
  Plus,
  Trash2,
  Download,
  Table,
  GripVertical,
  Copy,
  ArrowUp,
  ArrowDown,
  Sparkles,
  BookOpen,
  Pencil,
  Check,
} from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';
import type { PricingTable, PricingRow } from '@/lib/pricing/types';

const priceRangeSchema = z.object({
  low: z.number().min(0),
  high: z.number().min(0),
}).refine((data) => data.low <= data.high, { message: 'High must be >= low' });

const sqFtRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
}).refine((data) => data.min <= data.max, { message: 'Max must be >= min' });

const pricingRowSchema = z.object({
  sqFtRange: sqFtRangeSchema,
  weekly: priceRangeSchema,
  biWeekly: priceRangeSchema,
  fourWeek: priceRangeSchema,
  general: priceRangeSchema,
  deep: priceRangeSchema,
  moveInOutBasic: priceRangeSchema,
  moveInOutFull: priceRangeSchema,
});

const pricingTableSchema = z.object({
  rows: z.array(pricingRowSchema).min(1, 'At least one pricing row is required'),
  maxSqFt: z.number().min(0),
});

type PricingTableFormData = z.infer<typeof pricingTableSchema>;

const SERVICE_FIELDS = [
  { key: 'weekly', label: 'Weekly Cleaning' },
  { key: 'biWeekly', label: 'Bi-Weekly Cleaning' },
  { key: 'fourWeek', label: '4 Week Cleaning' },
  { key: 'general', label: 'General Cleaning' },
  { key: 'deep', label: 'Deep Cleaning' },
  { key: 'moveInOutBasic', label: 'Move In/Move Out Basic' },
  { key: 'moveInOutFull', label: 'Move In/Move Out Deep' },
] as const;

const CONDITIONS = ['excellent', 'good', 'average', 'fair', 'poor', 'very-poor'] as const;

const DEFAULT_INITIAL_CLEANING = {
  multiplier: 1.5,
  requiredConditions: ['poor'] as string[],
  recommendedConditions: ['fair'] as string[],
  sheddingPetsMultiplier: 1.1,
  peopleMultiplier: 1.05,
  peopleMultiplierBase: 4,
  sheddingPetsMultiplierBase: 0,
};

export function PricingStructureEditClient({ structureId }: { structureId: string }) {
  const { api } = useDashboardApi();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [structureName, setStructureName] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'view' | 'manual' | 'upload'>('view');
  const [currentPricing, setCurrentPricing] = useState<PricingTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [initialCleaning, setInitialCleaning] = useState(DEFAULT_INITIAL_CLEANING);
  const [savingInitialCleaning, setSavingInitialCleaning] = useState(false);
  const [initialCleaningMessage, setInitialCleaningMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const { register, control, handleSubmit, formState: { errors }, reset, watch } = useForm<PricingTableFormData>({
    resolver: zodResolver(pricingTableSchema),
    defaultValues: { rows: [], maxSqFt: 0 },
  });

  const { fields, append, remove, update, insert } = useFieldArray({ control, name: 'rows' });
  const watchedRows = watch('rows');

  const loadStructure = useCallback(async (preserveMode?: 'view' | 'manual' | 'upload') => {
    if (!orgId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await api(`/api/dashboard/orgs/${orgId}/pricing-structures/${structureId}`);
      const data = await res.json();
      if (res.ok && data.pricingStructure) {
        const ps = data.pricingStructure;
        setStructureName(ps.name ?? '');
        const table = ps.pricingTable;
        if (table?.rows?.length) {
          setCurrentPricing(table);
          reset({ rows: table.rows, maxSqFt: table.maxSqFt ?? 0 });
          if (preserveMode) setUploadMode(preserveMode);
        } else {
          setCurrentPricing(null);
          reset({ rows: [], maxSqFt: 0 });
          if (preserveMode) setUploadMode(preserveMode);
        }
        const ic = ps.initialCleaningConfig;
        if (ic && typeof ic === 'object') {
          setInitialCleaning({
            multiplier: typeof ic.multiplier === 'number' ? ic.multiplier : DEFAULT_INITIAL_CLEANING.multiplier,
            requiredConditions: Array.isArray(ic.requiredConditions) ? ic.requiredConditions : DEFAULT_INITIAL_CLEANING.requiredConditions,
            recommendedConditions: Array.isArray(ic.recommendedConditions) ? ic.recommendedConditions : DEFAULT_INITIAL_CLEANING.recommendedConditions,
            sheddingPetsMultiplier: typeof ic.sheddingPetsMultiplier === 'number' ? ic.sheddingPetsMultiplier : DEFAULT_INITIAL_CLEANING.sheddingPetsMultiplier,
            peopleMultiplier: typeof ic.peopleMultiplier === 'number' ? ic.peopleMultiplier : DEFAULT_INITIAL_CLEANING.peopleMultiplier,
            peopleMultiplierBase: typeof ic.peopleMultiplierBase === 'number' ? ic.peopleMultiplierBase : DEFAULT_INITIAL_CLEANING.peopleMultiplierBase,
            sheddingPetsMultiplierBase: typeof ic.sheddingPetsMultiplierBase === 'number' ? ic.sheddingPetsMultiplierBase : DEFAULT_INITIAL_CLEANING.sheddingPetsMultiplierBase,
          });
        } else {
          setInitialCleaning(DEFAULT_INITIAL_CLEANING);
        }
      } else {
        setCurrentPricing(null);
        reset({ rows: [], maxSqFt: 0 });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load structure' });
    } finally {
      setLoading(false);
    }
  }, [orgId, structureId, reset, api]);

  useEffect(() => {
    let cancelled = false;
    api('/api/dashboard/orgs/selected')
      .then((r) => r.json())
      .then((d) => (d.org?.id ?? null) as string | null)
      .then((id) => {
        if (!cancelled) setOrgId(id);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [api]);

  useEffect(() => {
    if (orgId) loadStructure();
  }, [orgId, loadStructure]);

  useEffect(() => {
    if (!editingName) setNameInput(structureName);
  }, [structureName, editingName]);

  const addNewRow = () => {
    const lastRow = watchedRows?.length > 0 ? watchedRows[watchedRows.length - 1] : null;
    const newMin = lastRow?.sqFtRange ? lastRow.sqFtRange.max + 1 : 0;
    const newMax = newMin + 500;
    append({
      sqFtRange: { min: newMin, max: newMax },
      weekly: { low: 0, high: 0 },
      biWeekly: { low: 0, high: 0 },
      fourWeek: { low: 0, high: 0 },
      general: { low: 0, high: 0 },
      deep: { low: 0, high: 0 },
      moveInOutBasic: { low: 0, high: 0 },
      moveInOutFull: { low: 0, high: 0 },
    });
  };

  const duplicateRow = (index: number) => {
    const row = watchedRows?.[index];
    if (row) insert(index + 1, { ...row });
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0 && watchedRows) {
      const cur = watchedRows[index];
      const prev = watchedRows[index - 1];
      update(index - 1, cur);
      update(index, prev);
    } else if (direction === 'down' && index < (watchedRows?.length ?? 0) - 1 && watchedRows) {
      const cur = watchedRows[index];
      const next = watchedRows[index + 1];
      update(index + 1, cur);
      update(index, next);
    }
  };

  const onSave = async (data: PricingTableFormData) => {
    if (!orgId) return;
    setSaving(true);
    setMessage(null);
    try {
      const maxSqFt = Math.max(...(data.rows?.map((r) => r.sqFtRange?.max ?? 0) ?? []), 0);
      const pricingData: PricingTable = { ...data, maxSqFt };
      const res = await api(`/api/dashboard/orgs/${orgId}/pricing-structures/${structureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricingTable: pricingData }),
      });
      const result = await res.json();
      if (res.ok) {
        setCurrentPricing(pricingData);
        setMessage({ type: 'success', text: 'Pricing structure saved' });
        setUploadMode('view');
      } else {
        setMessage({ type: 'error', text: result.error ?? 'Save failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;
    setUploading(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api(`/api/dashboard/orgs/${orgId}/pricing-structures/${structureId}/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.message ?? 'File uploaded and applied' });
        await loadStructure('view');
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Upload failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Upload failed' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const toggleCondition = (list: 'requiredConditions' | 'recommendedConditions', condition: string) => {
    const current = initialCleaning[list];
    const next = current.includes(condition) ? current.filter((c) => c !== condition) : [...current, condition];
    setInitialCleaning((prev) => ({ ...prev, [list]: next }));
  };

  const saveInitialCleaningConfig = async () => {
    if (!orgId) return;
    setSavingInitialCleaning(true);
    setInitialCleaningMessage(null);
    try {
      const res = await api(`/api/dashboard/orgs/${orgId}/pricing-structures/${structureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initialCleaningConfig: initialCleaning }),
      });
      const data = await res.json();
      if (res.ok) {
        setInitialCleaningMessage({ type: 'success', text: 'Initial cleaning & multipliers saved' });
      } else {
        setInitialCleaningMessage({ type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setInitialCleaningMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSavingInitialCleaning(false);
    }
  };

  if (loading && !currentPricing && !structureName) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingDots size="lg" className="text-primary" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Select an organization first.</p>
        </CardContent>
      </Card>
    );
  }

  const saveName = async () => {
    const name = nameInput.trim();
    if (!name || !orgId) return;
    setSavingName(true);
    setNameError(null);
    try {
      const res = await api(`/api/dashboard/orgs/${orgId}/pricing-structures/${structureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok) {
        setStructureName(name);
        setEditingName(false);
      } else {
        setNameError(data.error ?? 'Failed to save name');
      }
    } catch {
      setNameError('Failed to save name');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  className="text-2xl font-bold border border-input rounded-md px-3 py-1.5 bg-background min-w-0 max-w-sm"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={saveName}
                  disabled={savingName || !nameInput.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {savingName ? <LoadingDots size="sm" className="text-current" /> : <Check className="h-4 w-4" />}
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingName(false); setNameInput(structureName); setNameError(null); }}
                  disabled={savingName}
                  className="rounded-md border px-2.5 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground">{structureName || 'Unnamed'}</h2>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Edit name"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          {nameError && <p className="text-sm text-destructive mt-1">{nameError}</p>}
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
            Create and manage the pricing table for this structure.
            <Link href="/help/pricing-structure-builder" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <BookOpen className="h-3.5 w-3.5" />
              Instructions
            </Link>
          </p>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button variant={uploadMode === 'view' ? 'default' : 'outline'} onClick={() => loadStructure('view')} className="gap-2">
          <Table className="h-4 w-4" />
          View Structure
        </Button>
        <Button variant={uploadMode === 'manual' ? 'default' : 'outline'} onClick={() => loadStructure('manual')} className="gap-2">
          <Sparkles className="h-4 w-4" />
          Build Pricing Structure
        </Button>
        <Button variant={uploadMode === 'upload' ? 'default' : 'outline'} onClick={() => setUploadMode('upload')} className="gap-2">
          <Upload className="h-4 w-4" />
          Import from Excel
        </Button>
        <Button variant="outline" onClick={() => window.open(`/api/dashboard/tools/download-template`, '_blank')} className="gap-2">
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <Card className="shadow-lg border border-border">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b border-border">
          <CardTitle className="text-xl">Initial cleaning & multipliers</CardTitle>
          <CardDescription>
            People and pet multipliers and initial cleaning rules for this pricing structure. Used when a tool uses this structure for quotes.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 pb-6 space-y-6">
          {initialCleaningMessage && (
            <div className={`p-4 rounded-lg ${initialCleaningMessage.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400'}`}>
              {initialCleaningMessage.text}
            </div>
          )}
          <div>
            <Label htmlFor="ic-multiplier" className="text-base font-semibold">Initial Cleaning Multiplier</Label>
            <p className="text-sm text-muted-foreground mt-1 mb-2">Price multiplier applied to General Clean (1.5 = 50% more)</p>
            <Input
              id="ic-multiplier"
              type="number"
              min={1.0}
              max={3.0}
              step={0.1}
              value={initialCleaning.multiplier}
              onChange={(e) => setInitialCleaning((prev) => ({ ...prev, multiplier: parseFloat(e.target.value) || 1.5 }))}
              className="h-10 max-w-[8rem]"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-base font-semibold">Shedding pets</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-2">Base count at regular rate, then multiplier per extra pet</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={initialCleaning.sheddingPetsMultiplierBase}
                  onChange={(e) => setInitialCleaning((prev) => ({ ...prev, sheddingPetsMultiplierBase: Math.max(0, Math.min(10, parseInt(e.target.value, 10) || 0)) }))}
                  className="h-10 w-20"
                />
                <span className="text-sm text-muted-foreground">pets at regular rate, then</span>
                <Input
                  type="number"
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  value={initialCleaning.sheddingPetsMultiplier}
                  onChange={(e) => setInitialCleaning((prev) => ({ ...prev, sheddingPetsMultiplier: parseFloat(e.target.value) || 1.1 }))}
                  className="h-10 max-w-[8rem]"
                />
                <span className="text-sm text-muted-foreground">× per extra pet</span>
              </div>
            </div>
            <div>
              <Label className="text-base font-semibold">People</Label>
              <p className="text-sm text-muted-foreground mt-1 mb-2">Base count at regular rate, then multiplier per extra person</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={initialCleaning.peopleMultiplierBase}
                  onChange={(e) => setInitialCleaning((prev) => ({ ...prev, peopleMultiplierBase: Math.max(0, Math.min(20, parseInt(e.target.value, 10) || 0)) }))}
                  className="h-10 w-20"
                />
                <span className="text-sm text-muted-foreground">people at regular rate, then</span>
                <Input
                  type="number"
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  value={initialCleaning.peopleMultiplier}
                  onChange={(e) => setInitialCleaning((prev) => ({ ...prev, peopleMultiplier: parseFloat(e.target.value) || 1.05 }))}
                  className="h-10 max-w-[8rem]"
                />
                <span className="text-sm text-muted-foreground">× per extra person</span>
              </div>
            </div>
          </div>
          <div>
            <Label className="text-base font-semibold">Home conditions requiring Initial Cleaning</Label>
            <p className="text-sm text-muted-foreground mt-1 mb-2">Select which conditions REQUIRE Initial Cleaning</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {CONDITIONS.map((c) => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={initialCleaning.requiredConditions.includes(c)}
                    onChange={() => toggleCondition('requiredConditions', c)}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-sm capitalize">{c.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-base font-semibold">Home conditions recommending Initial Cleaning</Label>
            <p className="text-sm text-muted-foreground mt-1 mb-2">Conditions that suggest (but do not require) Initial Cleaning</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {CONDITIONS.map((c) => (
                <label key={c} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={initialCleaning.recommendedConditions.includes(c)}
                    onChange={() => toggleCondition('recommendedConditions', c)}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-sm capitalize">{c.replace('-', ' ')}</span>
                </label>
              ))}
            </div>
          </div>
          <Button onClick={saveInitialCleaningConfig} disabled={savingInitialCleaning} className="gap-2">
            {savingInitialCleaning ? <LoadingDots size="sm" className="text-current" /> : <Save className="h-4 w-4" />}
            {savingInitialCleaning ? 'Saving…' : 'Save initial cleaning & multipliers'}
          </Button>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {uploadMode === 'view' && (
          <motion.div key="view" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="shadow-lg border-2">
              <CardHeader>
                <CardTitle>Current Pricing Structure</CardTitle>
                <CardDescription>Overview of all configured pricing rows and ranges</CardDescription>
              </CardHeader>
              <CardContent>
                {currentPricing?.rows?.length ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-input text-sm">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-input px-4 py-2 text-left font-semibold">Sq Ft Range</th>
                            <th className="border border-input px-4 py-2 text-center font-semibold">Weekly</th>
                            <th className="border border-input px-4 py-2 text-center font-semibold">Bi-Weekly</th>
                            <th className="border border-input px-4 py-2 text-center font-semibold">4 Week</th>
                            <th className="border border-input px-4 py-2 text-center font-semibold">General</th>
                            <th className="border border-input px-4 py-2 text-center font-semibold">Deep</th>
                            <th className="border border-input px-4 py-2 text-center font-semibold">Move In/Out Basic</th>
                            <th className="border border-input px-4 py-2 text-center font-semibold">Move In/Out Deep</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPricing.rows.map((row: PricingRow, i: number) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                              <td className="border border-input px-4 py-2 font-medium">
                                {row.sqFtRange.min} - {row.sqFtRange.max}
                              </td>
                              {(['weekly', 'biWeekly', 'fourWeek', 'general', 'deep', 'moveInOutBasic', 'moveInOutFull'] as const).map((k) => (
                                <td key={k} className="border border-input px-4 py-2 text-center">
                                  ${row[k].low} - ${row[k].high}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      <strong>Total Rows:</strong> {currentPricing.rows.length} | <strong>Max Sq Ft:</strong> {currentPricing.maxSqFt ?? 'N/A'}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" onClick={() => loadStructure('manual')}>Edit Pricing</Button>
                      <Button variant="outline" onClick={() => loadStructure('view')}>Refresh</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-4">No pricing data yet.</p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={() => setUploadMode('upload')}>Upload Excel</Button>
                      <Button variant="outline" onClick={() => loadStructure('manual')}>Add Pricing Manually</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {uploadMode === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Import from Excel</CardTitle>
                <CardDescription>Upload your pricing Excel file. It will be parsed and applied to this structure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="block">
                  <span className="sr-only">Choose file</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={onUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-primary"
                  />
                </label>
                {uploading && <p className="text-sm text-muted-foreground">Uploading…</p>}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {uploadMode === 'manual' && (
          <motion.div key="manual" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <form onSubmit={handleSubmit(onSave)}>
              <Card className="shadow-lg border-2">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <CardTitle className="text-2xl flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Build Your Pricing Structure
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Create pricing tiers by square footage range. Each tier has prices for all service types.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => loadStructure('manual')}>Reload</Button>
                      <Button type="button" size="sm" onClick={addNewRow} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Tier
                      </Button>
                    </div>
                  </div>
                  {fields.length > 0 && (
                    <p className="mt-4 text-sm text-foreground">
                      <strong>{fields.length}</strong> tier(s) • Max Sq Ft: <strong>{Math.max(...(watchedRows?.map((r: { sqFtRange?: { max?: number } }) => r.sqFtRange?.max ?? 0) ?? []), 0)}</strong>
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-6">
                  {fields.length === 0 ? (
                    <div className="text-center py-16 px-8 border-2 border-dashed border-input rounded-xl bg-muted/50">
                      <Sparkles className="h-16 w-16 text-primary mx-auto mb-4 opacity-50" />
                      <h3 className="text-xl font-semibold text-foreground mb-2">Start Building Your Pricing Structure</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Create pricing tiers by square footage. Each tier will have pricing for all service types.
                      </p>
                      <Button type="button" onClick={addNewRow} size="lg" className="gap-2">
                        <Plus className="h-5 w-5" />
                        Create Your First Pricing Tier
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {fields.map((field, index) => (
                        <motion.div key={field.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                          <Card className="border-2 shadow-lg bg-background">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                                <div className="flex items-center gap-4">
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">{index + 1}</div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-foreground">Pricing Tier {index + 1}</h3>
                                    <p className="text-sm text-muted-foreground">Square footage range and service prices</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {index > 0 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => moveRow(index, 'up')}><ArrowUp className="h-3 w-3" /></Button>
                                  )}
                                  {index < fields.length - 1 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => moveRow(index, 'down')}><ArrowDown className="h-3 w-3" /></Button>
                                  )}
                                  <Button type="button" variant="outline" size="sm" onClick={() => duplicateRow(index)}><Copy className="h-3 w-3" /></Button>
                                  <Button type="button" variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => remove(index)}><Trash2 className="h-3 w-3" /></Button>
                                </div>
                              </div>
                              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                                <Label className="text-base font-semibold text-foreground block mb-3">Square Footage Range</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm text-muted-foreground mb-1 block">Minimum Sq Ft</Label>
                                    <Input type="number" placeholder="0" {...register(`rows.${index}.sqFtRange.min`, { valueAsNumber: true })} />
                                    {errors.rows?.[index]?.sqFtRange?.min && <p className="text-sm text-red-500 mt-1">{errors.rows[index]?.sqFtRange?.min?.message}</p>}
                                  </div>
                                  <div>
                                    <Label className="text-sm text-muted-foreground mb-1 block">Maximum Sq Ft</Label>
                                    <Input type="number" placeholder="1500" {...register(`rows.${index}.sqFtRange.max`, { valueAsNumber: true })} />
                                    {errors.rows?.[index]?.sqFtRange?.max && <p className="text-sm text-red-500 mt-1">{errors.rows[index]?.sqFtRange?.max?.message}</p>}
                                  </div>
                                </div>
                              </div>
                              <div>
                                <Label className="text-base font-semibold text-foreground block mb-4">Service Pricing ($)</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                  {SERVICE_FIELDS.map((service) => (
                                    <div key={service.key} className="p-4 border rounded-lg bg-background">
                                      <Label className="text-sm font-semibold text-foreground mb-2 block">{service.label}</Label>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-xs text-muted-foreground mb-1 block">Low</Label>
                                          <Input type="number" placeholder="0" {...register(`rows.${index}.${service.key}.low` as const, { valueAsNumber: true })} />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground mb-1 block">High</Label>
                                          <Input type="number" placeholder="0" {...register(`rows.${index}.${service.key}.high` as const, { valueAsNumber: true })} />
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                      <div className="mt-8 p-6 bg-primary/5 rounded-lg border-2 border-primary/20 flex flex-wrap justify-between items-center gap-4">
                        <div>
                          <p className="font-semibold text-foreground">Ready to save?</p>
                          <p className="text-sm text-muted-foreground mt-1">Pricing will be available for tools that use this structure.</p>
                        </div>
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" size="lg" onClick={addNewRow} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Another Tier
                          </Button>
                          <Button type="submit" size="lg" disabled={saving} className="gap-2">
                            {saving ? <><LoadingDots size="sm" className="text-current" /> Saving…</> : <><Save className="h-4 w-4" /> Save Pricing Structure</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
