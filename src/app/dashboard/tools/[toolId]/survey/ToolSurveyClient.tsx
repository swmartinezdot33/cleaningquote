'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
} from 'lucide-react';
import type { SurveyQuestion } from '@/lib/survey/schema';

export default function ToolSurveyClient({ toolId }: { toolId: string }) {
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Partial<SurveyQuestion> | null>(null);
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

  useEffect(() => {
    loadQuestions();
    loadGHLFields();
  }, [toolId]);

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

    if (editingQuestion.type === 'select' && (!editingQuestion.options || editingQuestion.options.length === 0)) {
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

    const isNew = editingIndex === questions.length;
    let newList: SurveyQuestion[];

    if (isNew) {
      const q = { ...editingQuestion, order: questions.length } as SurveyQuestion;
      newList = questions.map((qu, i) => ({ ...qu, order: i })).concat([q]);
    } else {
      const idx = editingIndex!;
      newList = questions.map((qu, i) =>
        i === idx ? ({ ...editingQuestion, order: i } as SurveyQuestion) : { ...qu, order: i } as SurveyQuestion
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
          <p className="text-sm text-muted-foreground">Customize your quote form questions for this tool</p>
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
            <Card key={question.id} className="relative">
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
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
                <CardContent className="space-y-6 pt-6">
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
                      <div className="space-y-2">
                        {(editingQuestion.options ?? []).map((option, idx) => (
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
                              />
                              <Input
                                value={option.label}
                                onChange={(e) => {
                                  const newOptions = [...(editingQuestion.options || [])];
                                  newOptions[idx] = { ...newOptions[idx], label: e.target.value };
                                  setEditingQuestion({ ...editingQuestion, options: newOptions });
                                }}
                                placeholder="Label"
                              />
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
                            </div>
                            <div>
                              <Label className="text-xs">Skip to question (optional)</Label>
                              <Select
                                value={option.skipToQuestionId || 'next'}
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
                          </div>
                        ))}
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
