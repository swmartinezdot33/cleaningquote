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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, Save, Plus, Trash2, Download, Eye, EyeOff, Loader2 } from 'lucide-react';

const priceRangeSchema = z.object({
  low: z.number().min(0),
  high: z.number().min(0),
}).refine((data) => data.low <= data.high, {
  message: 'High price must be greater than or equal to low price',
});

const sqFtRangeSchema = z.object({
  min: z.number().min(0),
  max: z.number().min(0),
}).refine((data) => data.min <= data.max, {
  message: 'Max square footage must be greater than or equal to min',
});

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

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'manual'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPricing, setCurrentPricing] = useState<any>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PricingTableFormData>({
    resolver: zodResolver(pricingTableSchema),
    defaultValues: {
      rows: [],
      maxSqFt: 0,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'rows',
  });

  const watchedRows = watch('rows');

  useEffect(() => {
    // Check if password is stored in sessionStorage
    const storedPassword = sessionStorage.getItem('admin_password');
    if (storedPassword) {
      setPassword(storedPassword);
      checkAuth(storedPassword);
    }
  }, []);

  const checkAuth = async (pass: string) => {
    try {
      const response = await fetch('/api/admin/pricing', {
        headers: {
          'x-admin-password': pass,
        },
      });
      if (response.ok || response.status === 404) {
        // 404 means not authenticated or no data, but we can proceed
        const data = await response.json();
        setIsAuthenticated(true);
        if (data.exists && data.data) {
          setCurrentPricing(data.data);
          reset(data.data);
        }
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_password');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const handleLogin = () => {
    if (password) {
      sessionStorage.setItem('admin_password', password);
      checkAuth(password);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setSaveMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/upload-pricing', {
        method: 'POST',
        headers: {
          'x-admin-password': password,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      setSaveMessage({ type: 'success', text: result.message || 'File uploaded successfully!' });
      
      // Reload pricing data
      setTimeout(() => {
        loadPricingData();
      }, 1000);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload file',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPricingData = async () => {
    try {
      const response = await fetch('/api/admin/pricing', {
        headers: {
          'x-admin-password': password,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.data) {
          setCurrentPricing(data.data);
          reset(data.data);
          setUploadMode('manual');
        }
      }
    } catch (error) {
      console.error('Failed to load pricing:', error);
    }
  };

  const onSave = async (data: PricingTableFormData) => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Calculate maxSqFt from rows
      const maxSqFt = Math.max(...data.rows.map(row => row.sqFtRange.max), 0);
      const pricingData = {
        ...data,
        maxSqFt,
      };

      const response = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ data: pricingData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }

      setSaveMessage({ type: 'success', text: 'Pricing data saved successfully!' });
      setCurrentPricing(pricingData);
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to save pricing data',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addNewRow = () => {
    const lastRow = watchedRows.length > 0 ? watchedRows[watchedRows.length - 1] : null;
    const newMin = lastRow ? lastRow.sqFtRange.max + 1 : 0;
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

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto mt-20">
          <Card className="shadow-2xl border-2">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Admin Access</CardTitle>
              <CardDescription className="text-center">
                Enter your admin password to access the pricing management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="password">Admin Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="mt-2"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLogin();
                      }
                    }}
                  />
                </div>
                <Button onClick={handleLogin} className="w-full" size="lg">
                  Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Pricing Management</h1>
          <p className="text-gray-600">Upload Excel file or manually configure pricing structure</p>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 flex gap-4">
          <Button
            onClick={() => setUploadMode('upload')}
            variant={uploadMode === 'upload' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload Excel File
          </Button>
          <Button
            onClick={() => {
              setUploadMode('manual');
              loadPricingData();
            }}
            variant={uploadMode === 'manual' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Manual Configuration
          </Button>
        </div>

        {/* Save Message */}
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-4 rounded-md ${
              saveMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {saveMessage.text}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {uploadMode === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="shadow-xl border-2">
                <CardHeader>
                  <CardTitle>Upload Pricing Excel File</CardTitle>
                  <CardDescription>
                    Upload your Excel file with pricing data. The file will be parsed and stored automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="file-upload" className="text-lg">
                        Select Excel File (.xlsx or .xls)
                      </Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        disabled={isLoading}
                        className="mt-2"
                      />
                    </div>
                    {isLoading && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading and parsing file...
                      </div>
                    )}
                    {currentPricing && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800">
                          Current pricing: {currentPricing.rows?.length || 0} rows loaded
                        </p>
                        <Button
                          onClick={() => {
                            setUploadMode('manual');
                            loadPricingData();
                          }}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          View/Edit Pricing Data
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="manual"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <form onSubmit={handleSubmit(onSave)}>
                <Card className="shadow-xl border-2 mb-6">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Manual Pricing Configuration</CardTitle>
                        <CardDescription>
                          Configure pricing structure manually. Add, edit, or remove pricing rows.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={loadPricingData}
                          variant="outline"
                          size="sm"
                        >
                          Reload
                        </Button>
                        <Button
                          type="button"
                          onClick={addNewRow}
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Row
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {fields.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>No pricing rows configured.</p>
                          <Button
                            type="button"
                            onClick={addNewRow}
                            variant="outline"
                            className="mt-4"
                          >
                            Add First Row
                          </Button>
                        </div>
                      ) : (
                        fields.map((field, index) => (
                          <Card key={field.id} className="border-2">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Row {index + 1}</h3>
                                <Button
                                  type="button"
                                  onClick={() => remove(index)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <Label>Square Footage Range (Min)</Label>
                                  <Input
                                    type="number"
                                    {...register(`rows.${index}.sqFtRange.min`, { valueAsNumber: true })}
                                  />
                                  {errors.rows?.[index]?.sqFtRange?.min && (
                                    <p className="text-sm text-red-500 mt-1">
                                      {errors.rows[index]?.sqFtRange?.min?.message}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <Label>Square Footage Range (Max)</Label>
                                  <Input
                                    type="number"
                                    {...register(`rows.${index}.sqFtRange.max`, { valueAsNumber: true })}
                                  />
                                  {errors.rows?.[index]?.sqFtRange?.max && (
                                    <p className="text-sm text-red-500 mt-1">
                                      {errors.rows[index]?.sqFtRange?.max?.message}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                  { key: 'weekly', label: 'Weekly' },
                                  { key: 'biWeekly', label: 'Bi-Weekly' },
                                  { key: 'fourWeek', label: '4 Week' },
                                  { key: 'general', label: 'General' },
                                  { key: 'deep', label: 'Deep' },
                                  { key: 'moveInOutBasic', label: 'Move In/Out Basic' },
                                  { key: 'moveInOutFull', label: 'Move In/Out Full' },
                                ].map((service) => (
                                  <div key={service.key} className="space-y-2">
                                    <Label className="text-sm font-medium">{service.label}</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        type="number"
                                        placeholder="Low"
                                        {...register(`rows.${index}.${service.key}.low` as any, { valueAsNumber: true })}
                                      />
                                      <Input
                                        type="number"
                                        placeholder="High"
                                        {...register(`rows.${index}.${service.key}.high` as any, { valueAsNumber: true })}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>

                    {fields.length > 0 && (
                      <div className="mt-6 flex justify-end">
                        <Button
                          type="submit"
                          size="lg"
                          disabled={isSaving}
                          className="flex items-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save Pricing Data
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
