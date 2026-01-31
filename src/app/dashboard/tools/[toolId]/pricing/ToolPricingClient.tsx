'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  Save,
  Plus,
  Trash2,
  Download,
  Loader2,
  Table,
  GripVertical,
  Copy,
  ArrowUp,
  ArrowDown,
  Sparkles,
} from 'lucide-react';
import type { PricingTable } from '@/lib/pricing/types';

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

const CONDITIONS = ['excellent', 'good', 'average', 'fair', 'poor', 'very-poor'] as const;
const SERVICE_FIELDS = [
  { key: 'weekly', label: 'Weekly Cleaning' },
  { key: 'biWeekly', label: 'Bi-Weekly Cleaning' },
  { key: 'fourWeek', label: '4 Week Cleaning' },
  { key: 'general', label: 'General Cleaning' },
  { key: 'deep', label: 'Deep Cleaning' },
  { key: 'moveInOutBasic', label: 'Move In/Move Out Basic' },
  { key: 'moveInOutFull', label: 'Move In/Move Out Deep' },
] as const;

export default function ToolPricingClient({ toolId }: { toolId: string }) {
  const [uploadMode, setUploadMode] = useState<'view' | 'manual' | 'upload'>('view');
  const [currentPricing, setCurrentPricing] = useState<PricingTable | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [initialCleaning, setInitialCleaning] = useState({
    multiplier: 1.5,
    requiredConditions: ['poor'] as string[],
    recommendedConditions: ['fair'] as string[],
    sheddingPetsMultiplier: 1.1,
    peopleMultiplier: 1.05,
  });
  const [savingInitial, setSavingInitial] = useState(false);
  const [initialMessage, setInitialMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { register, control, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<PricingTableFormData>({
    resolver: zodResolver(pricingTableSchema),
    defaultValues: { rows: [], maxSqFt: 0 },
  });

  const { fields, append, remove, update, insert } = useFieldArray({ control, name: 'rows' });
  const watchedRows = watch('rows');

  const loadPricingData = async (preserveMode?: 'view' | 'manual' | 'upload') => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/pricing`);
      const data = await res.json();
      if (res.ok && data.exists && data.data) {
        setCurrentPricing(data.data);
        reset({ rows: data.data.rows || [], maxSqFt: data.data.maxSqFt || 0 });
        if (preserveMode) setUploadMode(preserveMode);
      } else {
        setCurrentPricing(null);
        reset({ rows: [], maxSqFt: 0 });
        if (preserveMode) setUploadMode(preserveMode);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load pricing' });
    } finally {
      setLoading(false);
    }
  };

  const loadInitialCleaning = async () => {
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/initial-cleaning-config`);
      if (res.ok) {
        const ic = await res.json();
        setInitialCleaning({
          multiplier: ic.multiplier ?? 1.5,
          requiredConditions: Array.isArray(ic.requiredConditions) ? ic.requiredConditions : ['poor'],
          recommendedConditions: Array.isArray(ic.recommendedConditions) ? ic.recommendedConditions : ['fair'],
          sheddingPetsMultiplier: ic.sheddingPetsMultiplier ?? 1.1,
          peopleMultiplier: ic.peopleMultiplier ?? 1.05,
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadPricingData();
    loadInitialCleaning();
  }, [toolId]);

  const addNewRow = () => {
    const lastRow = watchedRows?.length > 0 ? watchedRows[watchedRows.length - 1] : null;
    const newMin = lastRow && lastRow.sqFtRange ? lastRow.sqFtRange.max + 1 : 0;
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
    setSaving(true);
    setMessage(null);
    try {
      const maxSqFt = Math.max(...(data.rows?.map((r) => r.sqFtRange?.max ?? 0) ?? []), 0);
      const pricingData: PricingTable = { ...data, maxSqFt };
      const res = await fetch(`/api/dashboard/tools/${toolId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: pricingData }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setCurrentPricing(pricingData);
        setMessage({ type: 'success', text: 'Pricing structure saved' });
        setUploadMode('view');
      } else {
        throw new Error(result.error || 'Save failed');
      }
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`/api/dashboard/tools/${toolId}/upload-pricing`, { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: data.parsed !== false ? 'File uploaded and parsed' : (data.error ?? 'Uploaded') });
        await loadPricingData('view');
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

  const saveInitialCleaning = async () => {
    setSavingInitial(true);
    setInitialMessage(null);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/initial-cleaning-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialCleaning),
      });
      const data = await res.json();
      if (res.ok) {
        setInitialMessage({ type: 'success', text: data.message ?? 'Initial Cleaning config saved' });
      } else {
        setInitialMessage({ type: 'error', text: data.error ?? 'Failed to save' });
      }
    } catch {
      setInitialMessage({ type: 'error', text: 'Failed to save' });
    } finally {
      setSavingInitial(false);
    }
  };

  const toggleCondition = (list: 'requiredConditions' | 'recommendedConditions', condition: string) => {
    const current = initialCleaning[list];
    const next = current.includes(condition) ? current.filter((c) => c !== condition) : [...current, condition];
    setInitialCleaning((prev) => ({ ...prev, [list]: next }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Pricing Builder</h2>
          <p className="text-sm text-muted-foreground">Create and manage your quoting structure for this tool</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-4 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <Button
          variant={uploadMode === 'view' ? 'default' : 'outline'}
          onClick={() => loadPricingData('view')}
          className="gap-2"
        >
          <Table className="h-4 w-4" />
          View Structure
        </Button>
        <Button
          variant={uploadMode === 'manual' ? 'default' : 'outline'}
          onClick={() => loadPricingData('manual')}
          className="gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Build Pricing Structure
        </Button>
        <Button variant={uploadMode === 'upload' ? 'default' : 'outline'} onClick={() => setUploadMode('upload')} className="gap-2">
          <Upload className="h-4 w-4" />
          Import from Excel
        </Button>
        <Button variant="outline" onClick={() => window.open(`/api/dashboard/tools/${toolId}/download-template`, '_blank')} className="gap-2">
          <Download className="h-4 w-4" />
          Download Template
        </Button>
      </div>

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
                          {currentPricing.rows.map((row: any, i: number) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                              <td className="border border-input px-4 py-2 font-medium">
                                {row.sqFtRange?.min} - {row.sqFtRange?.max}
                              </td>
                              {['weekly', 'biWeekly', 'fourWeek', 'general', 'deep', 'moveInOutBasic', 'moveInOutFull'].map((k) => (
                                <td key={k} className="border border-input px-4 py-2 text-center">
                                  ${row[k]?.low ?? 0} - ${row[k]?.high ?? 0}
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
                      <Button variant="outline" onClick={() => loadPricingData('manual')}>Edit Pricing</Button>
                      <Button variant="outline" onClick={() => loadPricingData('view')}>Refresh</Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-4">No pricing data yet.</p>
                    <div className="flex gap-2 justify-center">
                      <Button variant="outline" onClick={() => setUploadMode('upload')}>Upload Excel</Button>
                      <Button variant="outline" onClick={() => loadPricingData('manual')}>Add Pricing Manually</Button>
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
                <CardDescription>Upload your pricing Excel file. It will be parsed and stored for this tool.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" size="sm" onClick={() => window.open(`/api/dashboard/tools/${toolId}/download-template`, '_blank')} className="gap-2">
                  <Download className="h-4 w-4" />
                  Download pricing template
                </Button>
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
                      <Button type="button" variant="outline" size="sm" onClick={() => loadPricingData('manual')}>
                        Reload
                      </Button>
                      <Button type="button" size="sm" onClick={addNewRow} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Tier
                      </Button>
                    </div>
                  </div>
                  {fields.length > 0 && (
                    <p className="mt-4 text-sm text-foreground">
                      <strong>{fields.length}</strong> tier(s) • Max Sq Ft:{' '}
                      <strong>{Math.max(...(watchedRows?.map((r: any) => r.sqFtRange?.max ?? 0) ?? []), 0)}</strong>
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
                                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold text-foreground">Pricing Tier {index + 1}</h3>
                                    <p className="text-sm text-muted-foreground">Square footage range and service prices</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  {index > 0 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => moveRow(index, 'up')}>
                                      <ArrowUp className="h-3 w-3" />
                                    </Button>
                                  )}
                                  {index < fields.length - 1 && (
                                    <Button type="button" variant="outline" size="sm" onClick={() => moveRow(index, 'down')}>
                                      <ArrowDown className="h-3 w-3" />
                                    </Button>
                                  )}
                                  <Button type="button" variant="outline" size="sm" onClick={() => duplicateRow(index)}>
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button type="button" variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => remove(index)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>

                              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <Label className="text-base font-semibold text-foreground block mb-3">Square Footage Range</Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-sm text-muted-foreground mb-1 block">Minimum Sq Ft</Label>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      {...register(`rows.${index}.sqFtRange.min`, { valueAsNumber: true })}
                                    />
                                    {errors.rows?.[index]?.sqFtRange?.min && (
                                      <p className="text-sm text-red-500 mt-1">{errors.rows[index]?.sqFtRange?.min?.message}</p>
                                    )}
                                  </div>
                                  <div>
                                    <Label className="text-sm text-muted-foreground mb-1 block">Maximum Sq Ft</Label>
                                    <Input
                                      type="number"
                                      placeholder="1500"
                                      {...register(`rows.${index}.sqFtRange.max`, { valueAsNumber: true })}
                                    />
                                    {errors.rows?.[index]?.sqFtRange?.max && (
                                      <p className="text-sm text-red-500 mt-1">{errors.rows[index]?.sqFtRange?.max?.message}</p>
                                    )}
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
                                          <Input
                                            type="number"
                                            placeholder="0"
                                            {...register(`rows.${index}.${service.key}.low` as any, { valueAsNumber: true })}
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground mb-1 block">High</Label>
                                          <Input
                                            type="number"
                                            placeholder="0"
                                            {...register(`rows.${index}.${service.key}.high` as any, { valueAsNumber: true })}
                                          />
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
                          <p className="text-sm text-muted-foreground mt-1">Pricing will be available for quote calculations.</p>
                        </div>
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" size="lg" onClick={addNewRow} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Another Tier
                          </Button>
                          <Button type="submit" size="lg" disabled={saving} className="gap-2">
                            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> Save Pricing Structure</>}
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

      {/* Initial Cleaning Configuration - matches main admin app */}
      {uploadMode === 'view' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="shadow-lg hover:shadow-xl transition-shadow border border-border">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b pb-6">
              <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Initial Cleaning Configuration
              </CardTitle>
              <CardDescription>
                Configure pricing multiplier and home conditions for Initial Cleaning (first deep clean to reach maintenance standards)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8 pb-8">
              <div className="space-y-6">
                {initialMessage && (
                  <div
                    className={`p-4 rounded-lg ${
                      initialMessage.type === 'success'
                        ? 'bg-green-50 text-green-800 border border-green-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {initialMessage.text}
                  </div>
                )}

                <div>
                  <Label htmlFor="multiplier" className="text-base font-semibold">
                    Initial Cleaning Multiplier
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Price multiplier applied to General Clean price (1.0 = same as General, 1.5 = 50% more)
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      id="multiplier"
                      type="number"
                      min={1.0}
                      max={3.0}
                      step={0.1}
                      value={initialCleaning.multiplier}
                      onChange={(e) => setInitialCleaning((prev) => ({ ...prev, multiplier: parseFloat(e.target.value) || 1.5 }))}
                      className="flex-1 h-10 max-w-[8rem]"
                    />
                    <span className="text-sm font-semibold text-muted-foreground">×</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="shedding-pets-multiplier" className="text-base font-semibold">
                      Shedding Pets Multiplier
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Price multiplier per shedding pet (1.0 = no extra charge, 1.1 = 10% more per pet)
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        id="shedding-pets-multiplier"
                        type="number"
                        min={1.0}
                        max={2.0}
                        step={0.05}
                        value={initialCleaning.sheddingPetsMultiplier}
                        onChange={(e) => setInitialCleaning((prev) => ({ ...prev, sheddingPetsMultiplier: parseFloat(e.target.value) || 1.1 }))}
                        className="flex-1 h-10 max-w-[8rem]"
                      />
                      <span className="text-sm font-semibold text-muted-foreground">×</span>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="people-multiplier" className="text-base font-semibold">
                      People Multiplier
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1 mb-3">
                      Price multiplier per person (1.0 = no extra charge, 1.05 = 5% more per person)
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        id="people-multiplier"
                        type="number"
                        min={1.0}
                        max={2.0}
                        step={0.05}
                        value={initialCleaning.peopleMultiplier}
                        onChange={(e) => setInitialCleaning((prev) => ({ ...prev, peopleMultiplier: parseFloat(e.target.value) || 1.05 }))}
                        className="flex-1 h-10 max-w-[8rem]"
                      />
                      <span className="text-sm font-semibold text-muted-foreground">×</span>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">Home Conditions Requiring Initial Cleaning</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Select which home conditions REQUIRE Initial Cleaning
                  </p>
                  <div className="space-y-2">
                    {CONDITIONS.map((condition) => (
                      <label key={condition} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={initialCleaning.requiredConditions.includes(condition)}
                          onChange={() => toggleCondition('requiredConditions', condition)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm capitalize">{condition.replace('-', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">Home Conditions Recommending Initial Cleaning</Label>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Select which home conditions RECOMMEND Initial Cleaning (not required, but suggested)
                  </p>
                  <div className="space-y-2">
                    {CONDITIONS.map((condition) => (
                      <label key={condition} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={initialCleaning.recommendedConditions.includes(condition)}
                          onChange={() => toggleCondition('recommendedConditions', condition)}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm capitalize">{condition.replace('-', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={saveInitialCleaning}
                  disabled={savingInitial}
                  className="w-full h-11 font-semibold flex items-center gap-2"
                >
                  {savingInitial ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Initial Cleaning Config
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
