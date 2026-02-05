'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Edit,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Upload,
} from 'lucide-react';
import type { SurveyQuestion, SurveyQuestionOption } from '@/lib/survey/schema';

export default function ToolSurveyClient({ toolId }: { toolId: string }) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<SurveyQuestion> | null>(null);
  const [uploadingOptionIndex, setUploadingOptionIndex] = useState<number | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [ghlFields, setGhlFields] = useState<Array<{ key: string; name: string; type: string; fieldType?: string }>>([]);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [ghlFieldSearchTerm, setGhlFieldSearchTerm] = useState('');
  const [ghlFieldDropdownOpen, setGhlFieldDropdownOpen] = useState(false);
  const [fieldTypeValidation, setFieldTypeValidation] = useState<{
    valid: boolean;
    error?: string;
    warning?: string;
    ghlFieldType?: string;
    compatibleSurveyTypes?: string[];
  } | null>(null);
  const [schemaValidation, setSchemaValidation] = useState<{ valid: boolean; errors?: Array<{ message: string; suggestion: string }>; warnings?: Array<{ message: string; suggestion: string }> } | null>(null);
  const [fieldChangeImpact, setFieldChangeImpact] = useState<{ breaking: boolean; impact: string[]; affectedSystems?: string[]; recommendation: string } | null>(null);
  const [squareFeetSyncedTiers, setSquareFeetSyncedTiers] = useState<Array<{ value: string; label: string }> | null>(null);

  useEffect(() => {
    loadQuestions();
    loadGHLFields();
  }, [toolId]);

  // When editing square footage with sync on, fetch current pricing tiers for display
  useEffect(() => {
    if (editingQuestion?.id === 'squareFeet' && editingQuestion?.syncOptionsWithPricingTable) {
      let cancelled = false;
      fetch(`/api/tools/by-id/pricing-tiers?toolId=${encodeURIComponent(toolId)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!cancelled && data.tiers?.length) setSquareFeetSyncedTiers(data.tiers.map((t: { value: string; label: string }) => ({ value: t.value, label: t.label })));
          else if (!cancelled) setSquareFeetSyncedTiers([]);
        })
        .catch(() => { if (!cancelled) setSquareFeetSyncedTiers([]); });
      return () => { cancelled = true; };
    } else {
      setSquareFeetSyncedTiers(null);
    }
  }, [editingQuestion?.id, editingQuestion?.syncOptionsWithPricingTable, toolId]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/survey-questions`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.questions)) {
        setQuestions(data.questions.sort((a: SurveyQuestion, b: SurveyQuestion) => a.order - b.order));
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load questions' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadGHLFields = async () => {
    setIsLoadingFields(true);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/ghl-custom-fields`);
      const data = await res.json();
      if (data.fields && Array.isArray(data.fields)) {
        const valid = data.fields.filter((f: { key?: string }) => f?.key?.trim());
        setGhlFields(valid.length > 0 ? valid : [
          { key: 'firstName', name: 'First Name', type: 'native' },
          { key: 'lastName', name: 'Last Name', type: 'native' },
          { key: 'email', name: 'Email', type: 'native' },
          { key: 'phone', name: 'Phone', type: 'native' },
        ]);
      } else {
        setGhlFields([
          { key: 'firstName', name: 'First Name', type: 'native' },
          { key: 'lastName', name: 'Last Name', type: 'native' },
          { key: 'email', name: 'Email', type: 'native' },
          { key: 'phone', name: 'Phone', type: 'native' },
        ]);
      }
    } catch {
      setGhlFields([
        { key: 'firstName', name: 'First Name', type: 'native' },
        { key: 'lastName', name: 'Last Name', type: 'native' },
        { key: 'email', name: 'Email', type: 'native' },
        { key: 'phone', name: 'Phone', type: 'native' },
      ]);
    } finally {
      setIsLoadingFields(false);
    }
  };

  const validateFieldMapping = async (surveyType: string, ghlMapping: string | undefined) => {
    if (!ghlMapping?.trim()) {
      setFieldTypeValidation(null);
      return;
    }
    try {
      const res = await fetch(
        `/api/dashboard/tools/${toolId}/field-type-validator?surveyFieldType=${encodeURIComponent(surveyType)}&ghlFieldMapping=${encodeURIComponent(ghlMapping)}`
      );
      const validation = await res.json();
      setFieldTypeValidation(validation);
    } catch {
      setFieldTypeValidation({ valid: false, error: 'Failed to validate field type' });
    }
  };

  const validateSchemaChange = async (question: Partial<SurveyQuestion>) => {
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/survey-schema-validator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', question }),
      });
      const result = await res.json();
      setSchemaValidation(result);
      return result;
    } catch {
      setSchemaValidation({ valid: false, errors: [] });
      return { valid: false, errors: [] };
    }
  };

  const checkFieldChangeImpact = async (fieldId: string, oldQuestion: SurveyQuestion | undefined, newQuestion: Partial<SurveyQuestion>) => {
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/survey-schema-validator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-impact', fieldId, oldQuestion, newQuestion }),
      });
      const result = await res.json();
      setFieldChangeImpact(result);
      return result;
    } catch {
      return null;
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: `custom_${Date.now()}`,
      label: 'New Question',
      type: 'text',
      required: false,
      order: Math.max(...questions.map((q) => q.order), -1) + 1,
    };
    setEditingQuestion(newQuestion);
    setEditingIndex(questions.length);
  };

  const handleEditQuestion = (index: number) => {
    setEditingQuestion({ ...questions[index] });
    setEditingIndex(index);
  };

  const handleDeleteQuestion = async (index: number) => {
    const question = questions[index];
    if (question.isCoreField) {
      setMessage({ type: 'error', text: `Cannot delete core field "${question.label}"` });
      return;
    }
    if (!confirm(`Delete question "${question.label}"?`)) return;
    const newList = questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i }));
    await saveQuestions(newList);
    if (editingIndex === index) {
      setEditingQuestion(null);
      setEditingIndex(null);
    } else if (editingIndex != null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const saveQuestions = async (newList: SurveyQuestion[]) => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/dashboard/tools/${toolId}/survey-questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: newList }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuestions(newList.sort((a, b) => a.order - b.order));
        setMessage({ type: 'success', text: 'Survey saved' });
        setTimeout(() => setMessage(null), 2000);
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Failed to save' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;

    const validation = await validateSchemaChange(editingQuestion);
    if (!validation?.valid && validation?.errors?.length) {
      setMessage({ type: 'error', text: validation.errors.map((e: { message: string }) => e.message).join('; ') });
      return;
    }

    if (!editingQuestion.label?.trim() || !editingQuestion.id?.trim()) {
      setMessage({ type: 'error', text: 'Label and ID are required' });
      return;
    }

    const squareFeetSynced = editingQuestion.id === 'squareFeet' && !!editingQuestion.syncOptionsWithPricingTable;
    if (editingQuestion.type === 'select' && !squareFeetSynced && (!editingQuestion.options || editingQuestion.options.length === 0)) {
      setMessage({ type: 'error', text: 'Select questions must have at least one option' });
      return;
    }

    if (editingQuestion.ghlFieldMapping?.trim() && fieldTypeValidation && !fieldTypeValidation.valid) {
      setMessage({ type: 'error', text: fieldTypeValidation.error || 'Field type validation failed' });
      return;
    }

    if (editingIndex != null && editingIndex < questions.length && fieldChangeImpact?.breaking) {
      setMessage({ type: 'error', text: fieldChangeImpact.impact?.join('; ') || 'Breaking change' });
      return;
    }

    // When saving square footage with sync on, fetch current pricing tiers so saved options stay in sync
    let questionToSave = editingQuestion;
    if (editingQuestion.id === 'squareFeet' && editingQuestion.syncOptionsWithPricingTable) {
      try {
        const res = await fetch(`/api/tools/by-id/pricing-tiers?toolId=${encodeURIComponent(toolId)}`);
        const data = await res.json();
        if (res.ok && data.tiers?.length) {
          questionToSave = { ...editingQuestion, options: data.tiers.map((t: { value: string; label: string }) => ({ value: t.value, label: t.label })) };
        }
      } catch (_) {
        setMessage({ type: 'error', text: 'Failed to load pricing tiers for save' });
        return;
      }
    }

    const isNew = editingIndex === questions.length;
    let newList: SurveyQuestion[];

    // Normalize the question so options (including imageUrl, showLabel) are plain serializable objects and never dropped
    const normalizeQuestion = (q: Partial<SurveyQuestion> & { order: number }): SurveyQuestion => {
      const base = { ...q, order: q.order } as SurveyQuestion;
      if (q.type === 'select' && Array.isArray(q.options)) {
        base.options = q.options.map((opt) => {
          const o = opt as SurveyQuestionOption;
          const row: SurveyQuestionOption = { value: o?.value ?? '', label: o?.label ?? '' };
          if (o?.imageUrl != null && String(o.imageUrl).trim()) row.imageUrl = String(o.imageUrl).trim();
          if (o?.showLabel !== undefined) row.showLabel = o.showLabel;
          if (o?.skipToQuestionId != null) row.skipToQuestionId = o.skipToQuestionId;
          return row;
        });
      }
      return base;
    };

    if (isNew) {
      const q = normalizeQuestion({ ...questionToSave, order: questions.length });
      newList = questions.map((qu, i) => ({ ...qu, order: i })).concat([q]);
    } else {
      const idx = editingIndex!;
      const savedQuestion = normalizeQuestion({ ...questionToSave, order: idx });
      newList = questions.map((qu, i) =>
        i === idx ? savedQuestion : ({ ...qu, order: i } as SurveyQuestion)
      );
    }

    await saveQuestions(newList);
    setEditingQuestion(null);
    setEditingIndex(null);
    setFieldTypeValidation(null);
    setSchemaValidation(null);
    setFieldChangeImpact(null);
  };

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const newList = [...questions];
    [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
    const withOrder = newList.map((q, i) => ({ ...q, order: i }));
    await saveQuestions(withOrder);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Survey Builder</h2>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
            Customize your quote form questions for this tool.
            <Link href="/help/survey-builder" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
              <BookOpen className="h-3.5 w-3.5" />
              Instructions
            </Link>
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-lg p-4 flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {message.text}
        </div>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="pt-6 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
            Loading questions…
          </CardContent>
        </Card>
      ) : questions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No questions yet. Click &quot;Add Question&quot; to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <Card key={question?.id ? `${question.id}-${index}` : `q-${index}`} className="relative">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <GripVertical className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{question.label}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {question.id} • Type: {question.type}
                    </p>
                    {question.isCoreField && (
                      <p className="text-xs text-blue-600 mt-1">🔒 Core field (protected)</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveQuestion(index, 'up')}
                      disabled={index === 0 || isSaving}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleMoveQuestion(index, 'down')}
                      disabled={index === questions.length - 1 || isSaving}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEditQuestion(index)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    {!question.isCoreField && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteQuestion(index)}
                        disabled={isSaving}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Button onClick={handleAddQuestion} className="w-full" disabled={editingQuestion != null}>
        <Plus className="w-4 h-4 mr-2" />
        Add Question
      </Button>

      <AnimatePresence>
        {editingQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
            onClick={() => {
              setEditingQuestion(null);
              setEditingIndex(null);
              setFieldTypeValidation(null);
              setSchemaValidation(null);
              setFieldChangeImpact(null);
              setUploadMessage(null);
            }}
          >
            <Card className="w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
                <CardTitle>Edit Question</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingQuestion(null);
                    setEditingIndex(null);
                    setFieldTypeValidation(null);
                    setSchemaValidation(null);
                    setFieldChangeImpact(null);
                    setUploadMessage(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
                <CardContent className="space-y-6 pt-6">
                  {uploadMessage && (
                    <div
                      className={`rounded-lg p-3 flex items-center gap-2 text-sm ${
                        uploadMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {uploadMessage.type === 'success' ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 flex-shrink-0" />}
                      <span>{uploadMessage.text}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Question ID</Label>
                      <Input
                        value={editingQuestion.id ?? ''}
                        disabled={editingIndex !== null && editingIndex < questions.length}
                        className="bg-muted"
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, id: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={editingQuestion.type ?? 'text'}
                        onValueChange={async (value: SurveyQuestion['type']) => {
                          setEditingQuestion({ ...editingQuestion, type: value });
                          if (editingIndex != null && editingIndex < questions.length) {
                            await checkFieldChangeImpact(
                              editingQuestion.id!,
                              questions[editingIndex],
                              { ...editingQuestion, type: value }
                            );
                          }
                          if (editingQuestion.ghlFieldMapping) {
                            validateFieldMapping(value, editingQuestion.ghlFieldMapping);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="tel">Phone</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="address">Address</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Question Label</Label>
                    <Input
                      value={editingQuestion.label ?? ''}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, label: e.target.value })}
                      placeholder="What is your question?"
                    />
                  </div>

                  <div>
                    <Label>Placeholder (optional)</Label>
                    <Input
                      value={editingQuestion.placeholder ?? ''}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, placeholder: e.target.value })}
                      placeholder="e.g., Enter your answer"
                    />
                  </div>

                  {editingQuestion.type === 'select' && (
                    <div>
                      <Label>Options</Label>
                      {editingQuestion.id === 'squareFeet' && (
                        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-medium">Pricing mapping</p>
                          <p className="mt-1">
                            Option values (e.g. <code className="rounded bg-amber-100 px-1">1501-2000</code> or <code className="rounded bg-amber-100 px-1">0-1500</code>) are used to look up the pricing tier.
                          </p>
                          <label className="mt-3 flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!editingQuestion.syncOptionsWithPricingTable}
                              onChange={(e) => {
                                const on = e.target.checked;
                                if (on) {
                                  fetch(`/api/tools/by-id/pricing-tiers?toolId=${encodeURIComponent(toolId)}`)
                                    .then((res) => res.json())
                                    .then((data) => {
                                      if (data.tiers?.length) {
                                        setEditingQuestion({
                                          ...editingQuestion,
                                          syncOptionsWithPricingTable: true,
                                          options: data.tiers.map((t: { value: string; label: string }) => ({ value: t.value, label: t.label })),
                                        });
                                      } else {
                                        setMessage({ type: 'error', text: data.error || 'No pricing tiers found. Add tiers in the Pricing tab first.' });
                                      }
                                    })
                                    .catch(() => setMessage({ type: 'error', text: 'Failed to load pricing tiers' }));
                                } else {
                                  setEditingQuestion({
                                    ...editingQuestion,
                                    syncOptionsWithPricingTable: false,
                                    options: editingQuestion.options?.length ? [...editingQuestion.options] : [{ value: '0-1500', label: 'Less than 1,500 sq ft' }, { value: '1501-2000', label: '1,501 - 2,000 sq ft' }],
                                  });
                                }
                              }}
                              className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                            />
                            <span>Keep options in sync with pricing table (edits in the Pricing tab will add or update options here)</span>
                          </label>
                          {editingQuestion.syncOptionsWithPricingTable && (
                            <p className="mt-2 text-xs text-amber-800">
                              Options below are read-only and match the Pricing tab. Turn off sync to edit options manually.
                            </p>
                          )}
                        </div>
                      )}
                      <div className="space-y-2">
                        {(editingQuestion.id === 'squareFeet' && editingQuestion.syncOptionsWithPricingTable
                          ? (squareFeetSyncedTiers ?? editingQuestion.options ?? [])
                          : (editingQuestion.options ?? [])
                        ).map((option, idx) => {
                          const isSynced = editingQuestion.id === 'squareFeet' && !!editingQuestion.syncOptionsWithPricingTable;
                          return (
                          <div key={idx} className="flex flex-col gap-2 p-3 border border-border rounded-lg bg-muted/50">
                            <div className="flex gap-2 flex-wrap">
                              <Input
                                value={option.value}
                                onChange={(e) => {
                                  const newOptions = [...(editingQuestion.options || [])];
                                  newOptions[idx] = { ...newOptions[idx], value: e.target.value };
                                  setEditingQuestion({ ...editingQuestion, options: newOptions });
                                }}
                                placeholder="Value"
                                disabled={isSynced}
                                className={isSynced ? 'bg-muted cursor-not-allowed' : ''}
                              />
                              <Input
                                value={option.label}
                                onChange={(e) => {
                                  const newOptions = [...(editingQuestion.options || [])];
                                  newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                                  setEditingQuestion({ ...editingQuestion, options: newOptions });
                                }}
                                placeholder="Label"
                                disabled={isSynced}
                                className={isSynced ? 'bg-muted cursor-not-allowed' : ''}
                              />
                              {!isSynced && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newOptions = (editingQuestion.options || []).filter((_, i) => i !== idx);
                                    setEditingQuestion({ ...editingQuestion, options: newOptions });
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                            {!isSynced && (
                            <>
                              <div className="mt-2">
                                <Label className="text-xs">Option image (optional)</Label>
                                <p className="text-xs text-muted-foreground mb-1">Show a picture for this option so users can select by image (e.g. condition of home). Upload or paste URL.</p>
                                <div className="mt-1.5 flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-100">
                                      <Upload className="h-4 w-4" />
                                      Upload image
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        className="sr-only"
                                        onChange={async (e) => {
                                          const f = e.target.files?.[0];
                                          if (!f) return;
                                          setUploadingOptionIndex(idx);
                                          e.target.value = '';
                                          try {
                                            const form = new FormData();
                                            form.append('file', f);
                                            const res = await fetch(`/api/dashboard/tools/${toolId}/survey/upload-option-image`, {
                                              method: 'POST',
                                              body: form,
                                            });
                                            const data = await res.json().catch(() => ({}));
                                            const url = typeof data?.url === 'string' ? data.url.trim() : '';
                                            if (res.ok && url) {
                                              setEditingQuestion((prev) => {
                                                if (!prev || !Array.isArray(prev.options)) return prev;
                                                const options = prev.options.map((opt, i) =>
                                                  i === idx ? { ...opt, imageUrl: url } : opt
                                                );
                                                return { ...prev, options };
                                              });
                                              setUploadMessage({ type: 'success', text: 'Image added. Click "Save Question" below to keep your changes.' });
                                              setTimeout(() => setUploadMessage(null), 5000);
                                            } else {
                                              setUploadMessage({
                                                type: 'error',
                                                text: typeof data?.error === 'string' ? data.error : !res.ok ? `Upload failed (${res.status})` : 'Upload succeeded but no image URL was returned.',
                                              });
                                            }
                                          } catch {
                                            setUploadMessage({ type: 'error', text: 'Upload failed. Check your connection and try again.' });
                                          } finally {
                                            setUploadingOptionIndex(null);
                                          }
                                        }}
                                      />
                                    </label>
                                    {uploadingOptionIndex === idx && (
                                      <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                                    )}
                                  </div>
                                  {(option as SurveyQuestionOption).imageUrl?.trim() && (
                                    <div className="flex items-center gap-2">
                                      <div className="relative inline-block shrink-0">
                                        <img
                                          src={(option as SurveyQuestionOption).imageUrl}
                                          alt=""
                                          className="h-14 w-14 rounded-lg border border-gray-200 object-cover bg-gray-100"
                                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56"><rect fill="#f3f4f6" width="56" height="56"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="10">?</text></svg>'); }}
                                        />
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="icon"
                                          className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full shadow border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 p-0"
                                          onClick={() => {
                                            const newOptions = [...(editingQuestion.options || [])];
                                            const o = newOptions[idx] as SurveyQuestionOption;
                                            newOptions[idx] = { ...o, imageUrl: undefined };
                                            setEditingQuestion({ ...editingQuestion, options: newOptions });
                                          }}
                                          aria-label="Clear image"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      <span className="text-xs text-muted-foreground">Thumbnail · click X to clear</span>
                                    </div>
                                  )}
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Or paste image URL</summary>
                                    <Input
                                      value={(option as SurveyQuestionOption).imageUrl ?? ''}
                                      onChange={(e) => {
                                        const newOptions = [...(editingQuestion.options || [])];
                                        const o = newOptions[idx] as SurveyQuestionOption;
                                        newOptions[idx] = { ...o, imageUrl: e.target.value.trim() || undefined };
                                        setEditingQuestion({ ...editingQuestion, options: newOptions });
                                      }}
                                      placeholder="https://..."
                                      className="mt-1.5"
                                    />
                                  </details>
                                </div>
                              </div>
                              {((option as SurveyQuestionOption).imageUrl?.trim()) && (
                                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={(option as SurveyQuestionOption).showLabel !== false}
                                    onChange={(e) => {
                                      const newOptions = [...(editingQuestion.options || [])];
                                      const o = newOptions[idx] as SurveyQuestionOption;
                                      newOptions[idx] = { ...o, showLabel: e.target.checked };
                                      setEditingQuestion({ ...editingQuestion, options: newOptions });
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  <span className="text-xs">Show label with image</span>
                                </label>
                              )}
                              <div className="mt-2">
                                <Label className="text-xs">Skip to question (optional)</Label>
                                <Select
                                  value={(option as SurveyQuestionOption).skipToQuestionId || 'next'}
                                  onValueChange={(value) => {
                                    const newOptions = [...(editingQuestion.options || [])];
                                    newOptions[idx] = {
                                      ...newOptions[idx],
                                      skipToQuestionId: value === 'next' ? undefined : value,
                                    };
                                    setEditingQuestion({ ...editingQuestion, options: newOptions });
                                  }}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Next question" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px]">
                                    <SelectItem value="next">→ Next Question</SelectItem>
                                    <SelectItem value="__END__">🏁 Skip to Quote Summary</SelectItem>
                                    {questions
                                      .filter((q) => q.order > (editingQuestion.order ?? 0))
                                      .sort((a, b) => a.order - b.order)
                                      .map((q) => (
                                        <SelectItem key={q.id} value={q.id}>
                                          Q{q.order + 1}: {q.label.substring(0, 40)}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                            )}
                          </div>
                          );
                        })}
                        {!(editingQuestion.id === 'squareFeet' && editingQuestion.syncOptionsWithPricingTable) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOptions = [...(editingQuestion.options || []), { value: '', label: '' }];
                            setEditingQuestion({ ...editingQuestion, options: newOptions });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Option
                        </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={editingQuestion.required ?? false}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                      />
                      <span className="text-sm">Required</span>
                    </label>
                  </div>

                  <div>
                    <Label>GHL Field Mapping (optional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Map to a GHL custom field or native field (firstName, lastName, email, phone)
                    </p>
                    <Select
                      value={editingQuestion.ghlFieldMapping || 'none'}
                      onValueChange={(value) => {
                        const newMapping = value === 'none' ? undefined : value;
                        setEditingQuestion({ ...editingQuestion, ghlFieldMapping: newMapping });
                        validateFieldMapping(editingQuestion.type || 'text', newMapping);
                      }}
                      onOpenChange={(open) => {
                        setGhlFieldDropdownOpen(open);
                        if (!open) setGhlFieldSearchTerm('');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select GHL field" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {ghlFieldDropdownOpen && (
                          <div className="px-2 pb-2 sticky top-0 bg-white z-10">
                            <Input
                              placeholder="Search fields…"
                              value={ghlFieldSearchTerm}
                              onChange={(e) => setGhlFieldSearchTerm(e.target.value.toLowerCase())}
                              className="h-8 text-sm"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <SelectItem value="none">
                          <span className="text-muted-foreground">— No mapping —</span>
                        </SelectItem>
                        {ghlFields
                          .filter((field) => {
                            if (!ghlFieldSearchTerm) return true;
                            return (
                              field.name.toLowerCase().includes(ghlFieldSearchTerm) ||
                              field.key.toLowerCase().includes(ghlFieldSearchTerm)
                            );
                          })
                          .map((field) => (
                            <SelectItem key={field.key} value={field.key}>
                              <div className="flex flex-col">
                                <span className="font-medium">{field.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {field.key} {field.type !== 'native' ? `(${field.type})` : ''}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {editingQuestion.ghlFieldMapping && (
                      <div className="mt-2 space-y-2">
                        {fieldTypeValidation?.valid ? (
                          <div className="p-2 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
                            ✓ Compatible {fieldTypeValidation.ghlFieldType && `(HighLevel: ${fieldTypeValidation.ghlFieldType})`}
                            {fieldTypeValidation.warning && (
                              <p className="mt-1 text-amber-700">⚠️ {fieldTypeValidation.warning}</p>
                            )}
                          </div>
                        ) : fieldTypeValidation?.error ? (
                          <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                            ✗ {fieldTypeValidation.error}
                            {fieldTypeValidation.compatibleSurveyTypes?.length ? (
                              <p className="mt-1">Compatible types: {fieldTypeValidation.compatibleSurveyTypes.join(', ')}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              {fieldChangeImpact?.breaking && (
                <div className="mx-6 my-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                  <p className="text-sm font-semibold text-red-900">⚠️ Breaking Change Detected</p>
                  <p className="text-xs text-red-700 mt-2">This change would break the following systems:</p>
                  <ul className="text-xs text-red-700 mt-1 ml-4 list-disc">
                    {fieldChangeImpact.impact?.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                  {fieldChangeImpact.affectedSystems?.length ? (
                    <p className="text-xs text-red-700 mt-2">Affected: {fieldChangeImpact.affectedSystems.join(', ')}</p>
                  ) : null}
                  <p className="text-xs text-red-800 mt-2 font-medium">{fieldChangeImpact.recommendation}</p>
                </div>
              )}

              {schemaValidation && !schemaValidation.valid && schemaValidation.errors?.length ? (
                <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm font-semibold text-red-900">❌ Validation Errors</p>
                  {schemaValidation.errors.map((err: { message: string; suggestion: string }, i: number) => (
                    <div key={i} className="mt-2 text-xs">
                      <p className="text-red-800 font-medium">{err.message}</p>
                      <p className="text-red-700">{err.suggestion}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {schemaValidation?.warnings?.length ? (
                <div className="mx-6 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-semibold text-yellow-900">⚠️ Warnings</p>
                  {schemaValidation.warnings.map((w: { message: string; suggestion: string }, i: number) => (
                    <div key={i} className="mt-2 text-xs">
                      <p className="text-yellow-800 font-medium">{w.message}</p>
                      <p className="text-yellow-700">{w.suggestion}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex gap-2 justify-end border-t pt-4 p-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingQuestion(null);
                    setEditingIndex(null);
                    setFieldTypeValidation(null);
                    setSchemaValidation(null);
                    setFieldChangeImpact(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveQuestion}
                  disabled={
                    isSaving ||
                    Boolean(fieldChangeImpact?.breaking) ||
                    Boolean(schemaValidation && !schemaValidation.valid && (schemaValidation.errors?.length ?? 0) > 0)
                  }
                  className={fieldChangeImpact?.breaking ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {fieldChangeImpact?.breaking ? 'Cannot Save - Breaking Change' : 'Save Question'}
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
