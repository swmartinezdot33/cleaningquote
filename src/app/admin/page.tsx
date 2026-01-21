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
import { Upload, Save, Plus, Trash2, Download, Eye, EyeOff, Loader2, Table, GripVertical, Copy, ArrowUp, ArrowDown, Sparkles, HelpCircle, CheckSquare, Square, Edit, Settings, FileText, ExternalLink, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [uploadMode, setUploadMode] = useState<'upload' | 'manual' | 'view'>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [currentPricing, setCurrentPricing] = useState<any>(null);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Initial Cleaning Config State
  const [initialCleaningMultiplier, setInitialCleaningMultiplier] = useState(1.5);
  const [requiredConditions, setRequiredConditions] = useState<string[]>(['poor']);
  const [recommendedConditions, setRecommendedConditions] = useState<string[]>(['fair']);
  const [sheddingPetsMultiplier, setSheddingPetsMultiplier] = useState(1.1);
  const [peopleMultiplier, setPeopleMultiplier] = useState(1.05);
  const [isLoadingInitialCleaning, setIsLoadingInitialCleaning] = useState(false);
  const [isSavingInitialCleaning, setIsSavingInitialCleaning] = useState(false);
  const [initialCleaningMessage, setInitialCleaningMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const { fields, append, remove, update, insert } = useFieldArray({
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
        // 200 or 404 means authenticated (404 = no data, but auth worked)
        const data = await response.json();
        setIsAuthenticated(true);
        if (data.exists && data.data) {
          setCurrentPricing(data.data);
          reset(data.data);
          // Load in view mode by default
          setUploadMode('view');
        } else {
          // No data exists, default to view mode anyway
          setUploadMode('view');
        }
        // Load Initial Cleaning config
        loadInitialCleaningConfig();
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_password');
        setSaveMessage({ 
          type: 'error', 
          text: 'Invalid password. Please try again.' 
        });
      } else {
        // Other errors (like 500) - might be KV not configured
        const errorData = await response.json().catch(() => ({}));
        if (errorData.message && errorData.message.includes('KV storage not configured')) {
          // KV not configured - allow login but show message
          setIsAuthenticated(true);
          setSaveMessage({ 
            type: 'error', 
            text: 'KV storage not configured for local dev. You can still use the interface, but pricing data won\'t persist.' 
          });
        } else {
          setIsAuthenticated(false);
          setSaveMessage({ 
            type: 'error', 
            text: 'Authentication failed. Please check your password and try again.' 
          });
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setSaveMessage({ 
        type: 'error', 
        text: 'Connection error. Please check your dev server is running.' 
      });
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
      
      if (result.parsed === false) {
        // Show detailed error message including the actual parsing error
        let errorText = result.message || 'File uploaded but parsing failed.';
        if (result.error) {
          errorText += `\n\nError: ${result.error}`;
        }
        if (result.note) {
          errorText += `\n\n${result.note}`;
        }
        setSaveMessage({ 
          type: 'error', 
          text: errorText
        });
      } else {
        setSaveMessage({ type: 'success', text: result.message || 'File uploaded successfully!' });
        
        // Reload pricing data immediately to show the parsed structure
        setTimeout(async () => {
          const loaded = await loadPricingData('view');
          // Data will be shown in view mode since we passed 'view' as preserveMode
        }, 1500);
      }
    } catch (error) {
      setSaveMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload file',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadPricingData = async (preserveMode?: 'view' | 'manual' | 'upload') => {
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
          // Only switch to manual mode if we're not preserving a specific mode and not already in view mode
          if (!preserveMode && uploadMode !== 'view') {
            setUploadMode('manual');
          } else if (preserveMode) {
            // Preserve the requested mode
            setUploadMode(preserveMode);
          }
          return true;
        } else {
          // No structured data found - try to parse from uploaded file
          console.log('No structured data found, file may need to be parsed');
          setCurrentPricing(null);
          return false;
        }
      } else if (response.status === 401) {
        setSaveMessage({ type: 'error', text: 'Unauthorized. Please log in again.' });
        setIsAuthenticated(false);
        sessionStorage.removeItem('admin_password');
      }
    } catch (error) {
      console.error('Failed to load pricing:', error);
      setSaveMessage({ 
        type: 'error', 
        text: 'Failed to load pricing data. Please try again.' 
      });
    }
    return false;
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

  const loadInitialCleaningConfig = async () => {
    setIsLoadingInitialCleaning(true);
    try {
      const response = await fetch('/api/admin/initial-cleaning-config', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setInitialCleaningMultiplier(data.multiplier);
        setRequiredConditions(data.requiredConditions);
        setRecommendedConditions(data.recommendedConditions);
        setSheddingPetsMultiplier(data.sheddingPetsMultiplier ?? 1.1);
        setPeopleMultiplier(data.peopleMultiplier ?? 1.05);
      }
    } catch (error) {
      console.error('Error loading Initial Cleaning config:', error);
    } finally {
      setIsLoadingInitialCleaning(false);
    }
  };

  const handleSaveInitialCleaningConfig = async () => {
    setIsSavingInitialCleaning(true);
    setInitialCleaningMessage(null);

    try {
      const response = await fetch('/api/admin/initial-cleaning-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          multiplier: initialCleaningMultiplier,
          requiredConditions,
          recommendedConditions,
          sheddingPetsMultiplier,
          peopleMultiplier,
        }),
      });

      if (response.ok) {
        setInitialCleaningMessage({ type: 'success', text: 'Initial Cleaning configuration saved successfully!' });
      } else {
        setInitialCleaningMessage({
          type: 'error',
          text: 'Failed to save Initial Cleaning configuration. Please try again.',
        });
      }
    } catch (error) {
      setInitialCleaningMessage({
        type: 'error',
        text: 'Failed to save Initial Cleaning configuration. Please try again.',
      });
    } finally {
      setIsSavingInitialCleaning(false);
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

  const duplicateRow = (index: number) => {
    const rowToDuplicate = watchedRows[index];
    if (rowToDuplicate) {
      insert(index + 1, { ...rowToDuplicate });
    }
  };

  const moveRow = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const currentRow = watchedRows[index];
      const prevRow = watchedRows[index - 1];
      update(index - 1, currentRow);
      update(index, prevRow);
    } else if (direction === 'down' && index < watchedRows.length - 1) {
      const currentRow = watchedRows[index];
      const nextRow = watchedRows[index + 1];
      update(index + 1, currentRow);
      update(index, nextRow);
    }
  };

  const toggleRowSelection = (index: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
  };

  const selectAllRows = () => {
    if (selectedRows.size === fields.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(Array.from({ length: fields.length }, (_, i) => i)));
    }
  };

  const applyBulkEdit = (field: string, value: number) => {
    selectedRows.forEach((index) => {
      const currentRow = watchedRows[index] as any;
      if (currentRow) {
        const updatedRow = { ...currentRow };
        
        // Handle nested fields like service.low or service.high
        const parts = field.split('.');
        if (parts.length === 2) {
          const [service, prop] = parts;
          if (service in updatedRow && typeof updatedRow[service] === 'object') {
            updatedRow[service] = { ...updatedRow[service], [prop]: value };
          }
        } else if (parts.length === 3) {
          const [section, range, prop] = parts;
          if (section in updatedRow && typeof updatedRow[section] === 'object') {
            updatedRow[section] = { ...updatedRow[section], [prop]: value };
          }
        } else {
          updatedRow[field] = value;
        }
        
        update(index, updatedRow);
      }
    });
  };

  const deleteSelectedRows = () => {
    const sortedIndices = Array.from(selectedRows).sort((a, b) => b - a);
    sortedIndices.forEach((index) => remove(index));
    setSelectedRows(new Set());
    if (sortedIndices.length === fields.length) {
      setBulkEditMode(false);
    }
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
    <TooltipProvider>
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-[#f61590]" />
                <h1 className="text-4xl font-bold text-gray-900">Pricing Builder</h1>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="flex items-center gap-2"
                  title="Preview the quoter page"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">View Quoter</span>
                </Button>
                <Button
                  onClick={() => router.push('/admin/survey-builder')}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Survey Builder</span>
                </Button>
                <Button
                  onClick={() => router.push('/admin/settings')}
                  variant="outline"
                  size="icon"
                  className="px-2.5"
                  title="GHL Integration Settings"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-gray-600">Create and manage your quoting structure with an intuitive interface</p>
          </div>

        {/* Mode Toggle */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <Button
            onClick={() => {
              loadPricingData('manual');
            }}
            variant={uploadMode === 'manual' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Build Pricing Structure
          </Button>
          <Button
            onClick={() => {
              loadPricingData('view');
            }}
            variant={uploadMode === 'view' ? 'default' : 'outline'}
            className="flex items-center gap-2"
          >
            <Table className="h-4 w-4" />
            View Structure
          </Button>
          {uploadMode === 'manual' && (
            <>
              <Button
                onClick={() => setUploadMode('upload')}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import from Excel
              </Button>
              <Button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/download-template', {
                      headers: {
                        'x-admin-password': password,
                      },
                    });
                    
                    if (response.ok) {
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'Pricing_Template.xlsx';
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                      setSaveMessage({ 
                        type: 'success', 
                        text: 'Template downloaded successfully!' 
                      });
                    } else {
                      const errorData = await response.json();
                      setSaveMessage({ 
                        type: 'error', 
                        text: errorData.error || 'Failed to download template' 
                      });
                    }
                  } catch (error) {
                    setSaveMessage({ 
                      type: 'error', 
                      text: 'Failed to download template' 
                    });
                  }
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
            </>
          )}
        </div>

        {/* Save Message */}
        {saveMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 p-4 rounded-md whitespace-pre-line ${
              saveMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {saveMessage.text}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {uploadMode === 'view' ? (
            <motion.div
              key="view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="shadow-xl border-2">
                <CardHeader>
                  <CardTitle>Current Pricing Structure</CardTitle>
                  <CardDescription>
                    Visual overview of all configured pricing rows and ranges
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {currentPricing && currentPricing.rows && currentPricing.rows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Sq Ft Range</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Weekly</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Bi-Weekly</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-semibold">4 Week</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-semibold">General</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Deep</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Move In/Out Basic</th>
                            <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Move In/Out Full</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentPricing.rows.map((row: any, index: number) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="border border-gray-300 px-4 py-2 font-medium">
                                {row.sqFtRange?.min} - {row.sqFtRange?.max}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                ${row.weekly?.low} - ${row.weekly?.high}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                ${row.biWeekly?.low} - ${row.biWeekly?.high}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                ${row.fourWeek?.low} - ${row.fourWeek?.high}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                ${row.general?.low} - ${row.general?.high}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                ${row.deep?.low} - ${row.deep?.high}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                ${row.moveInOutBasic?.low} - ${row.moveInOutBasic?.high}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-center">
                                ${row.moveInOutFull?.low} - ${row.moveInOutFull?.high}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-sm text-blue-800">
                          <strong>Total Rows:</strong> {currentPricing.rows.length} | 
                          <strong> Max Square Footage:</strong> {currentPricing.maxSqFt || 'N/A'}
                        </p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          onClick={() => {
                            loadPricingData('manual');
                          }}
                          variant="outline"
                        >
                          Edit Pricing
                        </Button>
                        <Button
                          onClick={() => {
                            loadPricingData(uploadMode);
                          }}
                          variant="outline"
                        >
                          Refresh
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-4">No pricing data found.</p>
                      <div className="flex gap-2 justify-center">
                        <Button
                          onClick={() => {
                            setUploadMode('upload');
                          }}
                          variant="outline"
                        >
                          Upload Excel File
                        </Button>
                        <Button
                          onClick={() => {
                            loadPricingData('manual');
                          }}
                          variant="outline"
                        >
                          Add Pricing Manually
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ) : uploadMode === 'upload' ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="shadow-xl border-2">
                <CardHeader>
                  <CardTitle>Import from Excel File</CardTitle>
                  <CardDescription>
                    Upload your Excel file with pricing data. The file will be parsed and stored automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <p className="text-sm text-blue-800 mb-2">
                        <strong>New to Excel upload?</strong> Download our template file to get started with the correct format.
                      </p>
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/admin/download-template', {
                              headers: {
                                'x-admin-password': password,
                              },
                            });
                            
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'Pricing_Template.xlsx';
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              setSaveMessage({ 
                                type: 'success', 
                                text: 'Template downloaded successfully!' 
                              });
                            } else {
                              const errorData = await response.json();
                              setSaveMessage({ 
                                type: 'error', 
                                text: errorData.error || 'Failed to download template' 
                              });
                            }
                          } catch (error) {
                            setSaveMessage({ 
                              type: 'error', 
                              text: 'Failed to download template' 
                            });
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download Excel Template
                      </Button>
                    </div>
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
                            loadPricingData('manual');
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
                <Card className="shadow-xl border-2 mb-6 bg-gradient-to-br from-white via-gray-50/50 to-white">
                  <CardHeader className="bg-gradient-to-r from-[#f61590]/5 via-transparent to-transparent border-b">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-5 w-5 text-[#f61590]" />
                          <CardTitle className="text-2xl">Build Your Pricing Structure</CardTitle>
                        </div>
                        <CardDescription className="text-base">
                          Create pricing tiers by square footage range. Each tier covers different service types and frequencies.
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {fields.length > 0 && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => loadPricingData(uploadMode)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Reload
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reload pricing data from storage</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  onClick={() => {
                                    setBulkEditMode(!bulkEditMode);
                                    setSelectedRows(new Set());
                                  }}
                                  variant={bulkEditMode ? 'default' : 'outline'}
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  {bulkEditMode ? <CheckSquare className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                                  Bulk Edit
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Select multiple tiers to edit at once</p>
                              </TooltipContent>
                            </Tooltip>
                            {bulkEditMode && selectedRows.size > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    onClick={deleteSelectedRows}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete {selectedRows.size}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Delete selected tiers</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              onClick={addNewRow}
                              size="sm"
                              className="flex items-center gap-2 shadow-lg"
                            >
                              <Plus className="h-4 w-4" />
                              Add Tier
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add a new pricing tier</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                    {fields.length > 0 && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-[#f61590]/10 to-transparent rounded-lg border border-[#f61590]/20">
                        <p className="text-sm text-gray-700">
                          <strong>{fields.length}</strong> pricing {fields.length === 1 ? 'tier' : 'tiers'} configured • 
                          Max Square Footage: <strong>{Math.max(...watchedRows.map((r: any) => r.sqFtRange?.max || 0), 0)}</strong>
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {fields.length === 0 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="text-center py-16 px-8 border-2 border-dashed border-gray-300 rounded-xl bg-gradient-to-br from-gray-50 to-white"
                        >
                          <Sparkles className="h-16 w-16 text-[#f61590] mx-auto mb-4 opacity-50" />
                          <h3 className="text-2xl font-semibold text-gray-900 mb-2">Start Building Your Pricing Structure</h3>
                          <p className="text-gray-600 mb-6 max-w-md mx-auto">
                            Create pricing tiers based on square footage ranges. Each tier will have pricing for all service types.
                          </p>
                          <Button
                            type="button"
                            onClick={addNewRow}
                            size="lg"
                            className="flex items-center gap-2 mx-auto shadow-lg"
                          >
                            <Plus className="h-5 w-5" />
                            Create Your First Pricing Tier
                          </Button>
                        </motion.div>
                      ) : (
                        <>
                          {bulkEditMode && fields.length > 0 && (
                            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Button
                                  type="button"
                                  onClick={selectAllRows}
                                  variant="outline"
                                  size="sm"
                                  className="flex items-center gap-2"
                                >
                                  {selectedRows.size === fields.length ? (
                                    <CheckSquare className="h-4 w-4" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                  {selectedRows.size === fields.length ? 'Deselect All' : 'Select All'}
                                </Button>
                                <span className="text-sm text-gray-700">
                                  {selectedRows.size} of {fields.length} tiers selected
                                </span>
                              </div>
                              {selectedRows.size > 0 && (
                                <div className="flex gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          const value = prompt('Enter percentage increase (e.g., 10 for 10%):');
                                          if (value && !isNaN(Number(value))) {
                                            const multiplier = 1 + Number(value) / 100;
                                            selectedRows.forEach((index) => {
                                              const row = watchedRows[index] as any;
                                              if (row) {
                                                const updated = { ...row };
                                                ['weekly', 'biWeekly', 'fourWeek', 'general', 'deep', 'moveInOutBasic', 'moveInOutFull'].forEach((service) => {
                                                  if (updated[service]) {
                                                    updated[service] = {
                                                      low: Math.round(updated[service].low * multiplier),
                                                      high: Math.round(updated[service].high * multiplier),
                                                    };
                                                  }
                                                });
                                                update(index, updated);
                                              }
                                            });
                                          }
                                        }}
                                        variant="outline"
                                        size="sm"
                                      >
                                        Increase Prices %
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Apply percentage increase to all prices in selected tiers</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </div>
                          )}
                          {fields.map((field, index) => (
                            <motion.div
                              key={field.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                            >
                              <Card className={`border-2 shadow-lg hover:shadow-xl transition-shadow bg-white ${bulkEditMode && selectedRows.has(index) ? 'ring-2 ring-[#f61590] ring-offset-2' : ''}`}>
                                <CardContent className="pt-6">
                                  <div className="flex justify-between items-center mb-6 pb-4 border-b">
                                    <div className="flex items-center gap-4">
                                      {bulkEditMode && (
                                        <button
                                          type="button"
                                          onClick={() => toggleRowSelection(index)}
                                          className="flex items-center justify-center w-6 h-6 border-2 rounded border-gray-300 hover:border-[#f61590] transition-colors"
                                        >
                                          {selectedRows.has(index) && (
                                            <CheckSquare className="h-4 w-4 text-[#f61590]" />
                                          )}
                                        </button>
                                      )}
                                      <div className="flex items-center gap-2">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Drag handle (up/down buttons available)</p>
                                          </TooltipContent>
                                        </Tooltip>
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f61590] to-[#f61590]/80 flex items-center justify-center text-white font-bold shadow-lg">
                                          {index + 1}
                                        </div>
                                      </div>
                                      <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Pricing Tier {index + 1}</h3>
                                        <p className="text-sm text-gray-500">Configure square footage range and service prices</p>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      {index > 0 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              onClick={() => moveRow(index, 'up')}
                                              variant="outline"
                                              size="sm"
                                              className="flex items-center gap-1"
                                            >
                                              <ArrowUp className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Move tier up</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {index < fields.length - 1 && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              type="button"
                                              onClick={() => moveRow(index, 'down')}
                                              variant="outline"
                                              size="sm"
                                              className="flex items-center gap-1"
                                            >
                                              <ArrowDown className="h-3 w-3" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Move tier down</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            onClick={() => duplicateRow(index)}
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center gap-1"
                                          >
                                            <Copy className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Duplicate this tier below</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            type="button"
                                            onClick={() => remove(index)}
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Delete this tier</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </div>

                                {/* Square Footage Range */}
                                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Label className="text-base font-semibold text-gray-900 block">Square Footage Range</Label>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs">Define the square footage range this tier covers. Ensure ranges don't overlap and cover all expected home sizes.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label className="text-sm text-gray-600 mb-1 block">Minimum Sq Ft</Label>
                                      <Input
                                        type="number"
                                        placeholder="e.g., 0"
                                        className="text-lg font-medium"
                                        {...register(`rows.${index}.sqFtRange.min`, { valueAsNumber: true })}
                                      />
                                      {errors.rows?.[index]?.sqFtRange?.min && (
                                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                                          <span>⚠️</span>
                                          {errors.rows[index]?.sqFtRange?.min?.message}
                                        </p>
                                      )}
                                    </div>
                                    <div>
                                      <Label className="text-sm text-gray-600 mb-1 block">Maximum Sq Ft</Label>
                                      <Input
                                        type="number"
                                        placeholder="e.g., 1500"
                                        className="text-lg font-medium"
                                        {...register(`rows.${index}.sqFtRange.max`, { valueAsNumber: true })}
                                      />
                                      {errors.rows?.[index]?.sqFtRange?.max && (
                                        <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                                          <span>⚠️</span>
                                          {errors.rows[index]?.sqFtRange?.max?.message}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {watchedRows[index]?.sqFtRange?.min !== undefined && watchedRows[index]?.sqFtRange?.max !== undefined && (
                                    <p className="text-sm text-gray-600 mt-2">
                                      Range: <span className="font-semibold">{watchedRows[index].sqFtRange.min} - {watchedRows[index].sqFtRange.max} sq ft</span>
                                    </p>
                                  )}
                                </div>

                                {/* Service Pricing */}
                                <div>
                                  <div className="flex items-center gap-2 mb-4">
                                    <Label className="text-base font-semibold text-gray-900 block">Service Pricing ($)</Label>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="max-w-xs">Set price ranges (low to high) for each service type. The quote calculator will use these ranges based on home size and condition.</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {[
                                      { key: 'weekly', label: 'Weekly Cleaning', icon: '📅', tooltip: 'Regular weekly maintenance cleaning' },
                                      { key: 'biWeekly', label: 'Bi-Weekly Cleaning', icon: '📆', tooltip: 'Cleaning every two weeks' },
                                      { key: 'fourWeek', label: '4 Week Cleaning', icon: '🗓️', tooltip: 'Monthly cleaning service' },
                                      { key: 'general', label: 'General Cleaning', icon: '✨', tooltip: 'Standard one-time cleaning' },
                                      { key: 'deep', label: 'Deep Cleaning', icon: '🧹', tooltip: 'Thorough deep cleaning service' },
                                      { key: 'moveInOutBasic', label: 'Move In/Out Basic', icon: '📦', tooltip: 'Basic move-in/out cleaning' },
                                      { key: 'moveInOutFull', label: 'Move In/Out Full', icon: '📦📦', tooltip: 'Complete move-in/out cleaning' },
                                    ].map((service) => (
                                      <div key={service.key} className="p-4 border-2 rounded-lg hover:border-[#f61590]/50 transition-colors bg-white">
                                        <Label className="text-sm font-semibold text-gray-900 mb-2 block flex items-center gap-2">
                                          <span>{service.icon}</span>
                                          <span>{service.label}</span>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <HelpCircle className="h-3 w-3 text-gray-400 cursor-help ml-auto" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{service.tooltip}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </Label>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <Label className="text-xs text-gray-500 mb-1 block">Low</Label>
                                            <Input
                                              type="number"
                                              placeholder="$0"
                                              className="text-sm"
                                              {...register(`rows.${index}.${service.key}.low` as any, { valueAsNumber: true })}
                                            />
                                            {(errors.rows?.[index] as any)?.[service.key]?.low && (
                                              <p className="text-xs text-red-500 mt-1">⚠️ Invalid</p>
                                            )}
                                          </div>
                                          <div>
                                            <Label className="text-xs text-gray-500 mb-1 block">High</Label>
                                            <Input
                                              type="number"
                                              placeholder="$0"
                                              className="text-sm"
                                              {...register(`rows.${index}.${service.key}.high` as any, { valueAsNumber: true })}
                                            />
                                            {(errors.rows?.[index] as any)?.[service.key]?.high && (
                                              <p className="text-xs text-red-500 mt-1">⚠️ Invalid</p>
                                            )}
                                          </div>
                                        </div>
                                        {(watchedRows[index] as any)?.[service.key]?.low !== undefined && (watchedRows[index] as any)?.[service.key]?.high !== undefined && (
                                          <p className="text-xs text-gray-600 mt-2 font-medium">
                                            ${(watchedRows[index] as any)[service.key].low} - ${(watchedRows[index] as any)[service.key].high}
                                          </p>
                                        )}
                                        {((errors.rows?.[index] as any)?.[service.key]?.message) && (
                                          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <span>⚠️</span>
                                            {((errors.rows?.[index] as any)?.[service.key] as any)?.message}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                        </>
                      )}
                    </div>

                    {fields.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-6 bg-gradient-to-r from-[#f61590]/5 via-transparent to-transparent rounded-lg border-2 border-[#f61590]/20 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">Ready to save your pricing structure?</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Your pricing will be immediately available for quote calculations.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            onClick={addNewRow}
                            variant="outline"
                            size="lg"
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Another Tier
                          </Button>
                          <Button
                            type="submit"
                            size="lg"
                            disabled={isSaving}
                            className="flex items-center gap-2 shadow-lg"
                          >
                            {isSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-4 w-4" />
                                Save Pricing Structure
                              </>
                            )}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Initial Cleaning Configuration Card */}
        {uploadMode === 'view' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <Card className="shadow-lg hover:shadow-xl transition-shadow border border-gray-200">
              <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-200 pb-6">
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
                  {initialCleaningMessage && (
                    <div
                      className={`p-4 rounded-lg ${
                        initialCleaningMessage.type === 'success'
                          ? 'bg-green-50 text-green-800 border border-green-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {initialCleaningMessage.text}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="multiplier" className="text-base font-semibold">
                      Initial Cleaning Multiplier
                    </Label>
                    <p className="text-sm text-gray-600 mt-1 mb-3">
                      Price multiplier applied to General Clean price (1.0 = same as General, 1.5 = 50% more)
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        id="multiplier"
                        type="number"
                        min="1.0"
                        max="3.0"
                        step="0.1"
                        value={initialCleaningMultiplier}
                        onChange={(e) => setInitialCleaningMultiplier(parseFloat(e.target.value) || 1.5)}
                        className="flex-1 h-10"
                      />
                      <span className="text-sm font-semibold text-gray-700">×</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shedding-pets-multiplier" className="text-base font-semibold">
                        Shedding Pets Multiplier
                      </Label>
                      <p className="text-sm text-gray-600 mt-1 mb-3">
                        Price multiplier per shedding pet (1.0 = no extra charge, 1.1 = 10% more per pet)
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          id="shedding-pets-multiplier"
                          type="number"
                          min="1.0"
                          max="2.0"
                          step="0.05"
                          value={sheddingPetsMultiplier}
                          onChange={(e) => setSheddingPetsMultiplier(parseFloat(e.target.value) || 1.1)}
                          className="flex-1 h-10"
                        />
                        <span className="text-sm font-semibold text-gray-700">×</span>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="people-multiplier" className="text-base font-semibold">
                        People Multiplier
                      </Label>
                      <p className="text-sm text-gray-600 mt-1 mb-3">
                        Price multiplier per person (1.0 = no extra charge, 1.05 = 5% more per person)
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          id="people-multiplier"
                          type="number"
                          min="1.0"
                          max="2.0"
                          step="0.05"
                          value={peopleMultiplier}
                          onChange={(e) => setPeopleMultiplier(parseFloat(e.target.value) || 1.05)}
                          className="flex-1 h-10"
                        />
                        <span className="text-sm font-semibold text-gray-700">×</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Home Conditions Requiring Initial Cleaning</Label>
                    <p className="text-sm text-gray-600 mt-1 mb-3">
                      Select which home conditions REQUIRE Initial Cleaning
                    </p>
                    <div className="space-y-2">
                      {['excellent', 'good', 'average', 'fair', 'poor', 'very-poor'].map((condition) => (
                        <label key={condition} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={requiredConditions.includes(condition)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRequiredConditions([...requiredConditions, condition]);
                              } else {
                                setRequiredConditions(requiredConditions.filter((c) => c !== condition));
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm capitalize">{condition}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-semibold">Home Conditions Recommending Initial Cleaning</Label>
                    <p className="text-sm text-gray-600 mt-1 mb-3">
                      Select which home conditions RECOMMEND Initial Cleaning (not required, but suggested)
                    </p>
                    <div className="space-y-2">
                      {['excellent', 'good', 'average', 'fair', 'poor', 'very-poor'].map((condition) => (
                        <label key={condition} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={recommendedConditions.includes(condition)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRecommendedConditions([...recommendedConditions, condition]);
                              } else {
                                setRecommendedConditions(recommendedConditions.filter((c) => c !== condition));
                              }
                            }}
                            className="w-4 h-4 rounded"
                          />
                          <span className="text-sm capitalize">{condition}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveInitialCleaningConfig}
                    disabled={isSavingInitialCleaning}
                    className="w-full h-11 font-semibold flex items-center gap-2"
                  >
                    {isSavingInitialCleaning ? (
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
      </main>
    </TooltipProvider>
  );
}
