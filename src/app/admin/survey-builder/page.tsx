'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RotateCw
} from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';
import { SurveyQuestion, SurveyQuestionOption, CALCULATION_LOCKED_QUESTION_IDS } from '@/lib/survey/schema';

export default function SurveyBuilderPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
  const [fieldTypeValidation, setFieldTypeValidation] = useState<{ valid: boolean; error?: string; warning?: string; ghlFieldType?: string; compatibleSurveyTypes?: string[] } | null>(null);
  const [compatibleTypes, setCompatibleTypes] = useState<string[]>(['text', 'email', 'tel', 'number', 'select', 'address']);
  
  // Schema validation states
  const [schemaValidation, setSchemaValidation] = useState<any>(null);
  const [fieldChangeImpact, setFieldChangeImpact] = useState<any>(null);
  const [showImpactWarning, setShowImpactWarning] = useState(false);

  useEffect(() => {
    const storedPassword = sessionStorage.getItem('admin_password');
    if (storedPassword) {
      setPassword(storedPassword);
      checkAuth(storedPassword);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadQuestions();
      loadGHLFields();
    }
  }, [isAuthenticated]);

  const loadGHLFields = async () => {
    setIsLoadingFields(true);
    try {
      const response = await fetch('/api/admin/ghl-custom-fields', {
        headers: {
          'x-admin-password': password,
        },
      });

      const data = await response.json();
      
      if (data.fields && Array.isArray(data.fields)) {
        const validFields = data.fields.filter((field: any) => 
          field && field.key && typeof field.key === 'string' && field.key.trim() !== ''
        );
        
        if (validFields.length > 0) {
          setGhlFields(validFields);
        } else {
          setGhlFields([
            { key: 'firstName', name: 'First Name', type: 'native' },
            { key: 'lastName', name: 'Last Name', type: 'native' },
            { key: 'email', name: 'Email', type: 'native' },
            { key: 'phone', name: 'Phone', type: 'native' },
          ]);
        }
      } else {
        setGhlFields([
          { key: 'firstName', name: 'First Name', type: 'native' },
          { key: 'lastName', name: 'Last Name', type: 'native' },
          { key: 'email', name: 'Email', type: 'native' },
          { key: 'phone', name: 'Phone', type: 'native' },
        ]);
      }
    } catch (error) {
      console.error('Failed to load GHL fields:', error);
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
    if (!ghlMapping || ghlMapping.trim() === '') {
      setFieldTypeValidation(null);
      setCompatibleTypes(['text', 'email', 'tel', 'number', 'select', 'address']);
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/field-type-validator?surveyFieldType=${encodeURIComponent(surveyType)}&ghlFieldMapping=${encodeURIComponent(ghlMapping)}`
      );

      const validation = await response.json();
      setFieldTypeValidation(validation);
      setCompatibleTypes(validation.compatibleSurveyTypes || ['text', 'email', 'tel', 'number', 'select', 'address']);
    } catch (error) {
      console.error('Failed to validate field mapping:', error);
      setFieldTypeValidation({
        valid: false,
        error: 'Failed to validate field type compatibility'
      });
    }
  };

  const validateSchemaChange = async (question: Partial<SurveyQuestion>) => {
    try {
      const response = await fetch('/api/admin/survey-schema-validator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          action: 'validate',
          question,
        }),
      });

      const result = await response.json();
      setSchemaValidation(result);
      return result;
    } catch (error) {
      console.error('Failed to validate schema:', error);
      return { valid: false, errors: [] };
    }
  };

  const checkFieldChangeImpact = async (fieldId: string, oldQuestion: SurveyQuestion | undefined, newQuestion: Partial<SurveyQuestion>) => {
    try {
      const response = await fetch('/api/admin/survey-schema-validator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          action: 'check-impact',
          fieldId,
          oldQuestion,
          newQuestion,
        }),
      });

      const result = await response.json();
      setFieldChangeImpact(result);
      
      if (result.breaking) {
        setShowImpactWarning(true);
      }
      
      return result;
    } catch (error) {
      console.error('Failed to check field change impact:', error);
      return null;
    }
  };

  const checkAuth = async (pass: string) => {
    try {
      const response = await fetch('/api/surveys/questions', {
        headers: {
          'x-admin-password': pass,
        },
      });
      if (response.ok || response.status === 404) {
        setIsAuthenticated(true);
        sessionStorage.setItem('admin_password', pass);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const handleLogin = () => {
    if (password.trim()) {
      checkAuth(password);
    }
  };

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/surveys/questions', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load questions: ${response.status}`);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.questions)) {
        setQuestions(data.questions.sort((a: any, b: any) => a.order - b.order));
        setMessage({ type: 'success', text: 'Questions loaded' });
        setTimeout(() => setMessage(null), 2000);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to load questions';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: `custom_${Date.now()}`,
      label: 'New Question',
      type: 'text',
      required: false,
      order: Math.max(...questions.map(q => q.order), -1) + 1,
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
    
    // Prevent deletion of core fields
    if (question.isCoreField) {
      setMessage({ type: 'error', text: `Cannot delete core field "${question.label}"` });
      return;
    }

    if (!confirm(`Delete question "${question.label}"?`)) return;

    try {
      setIsSaving(true);
      const response = await fetch('/api/surveys/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          action: 'delete',
          id: question.id,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions.sort((a: any, b: any) => a.order - b.order));
        setMessage({ type: 'success', text: 'Question deleted' });
        setTimeout(() => setMessage(null), 2000);
      } else {
        throw new Error(data.error || 'Failed to delete question');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete question';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;

    // Validate schema change
    const validation = await validateSchemaChange(editingQuestion);
    
    if (!validation.valid && validation.errors && validation.errors.length > 0) {
      const errorMessages = validation.errors.map((e: any) => e.message).join('; ');
      setMessage({ type: 'error', text: `Validation failed: ${errorMessages}` });
      return;
    }

    // Validate
    if (!editingQuestion.label || !editingQuestion.id) {
      setMessage({ type: 'error', text: 'Label and ID are required' });
      return;
    }

    if (editingQuestion.type === 'select' && (!editingQuestion.options || editingQuestion.options.length === 0)) {
      setMessage({ type: 'error', text: 'Select questions must have at least one option' });
      return;
    }

    // Validate field type compatibility
    if (editingQuestion.ghlFieldMapping && editingQuestion.ghlFieldMapping.trim() !== '') {
      if (fieldTypeValidation && !fieldTypeValidation.valid) {
        setMessage({ type: 'error', text: `Field type validation failed: ${fieldTypeValidation.error}` });
        return;
      }
    }

    // Check for breaking changes if this is an update and field type changed
    if (editingIndex !== null && editingIndex < questions.length) {
      const oldQuestion = questions[editingIndex];
      if (fieldChangeImpact && fieldChangeImpact.breaking) {
        setMessage({ 
          type: 'error', 
          text: `Cannot save: ${fieldChangeImpact.impact.join('; ')}. Revert the changes or restore from backup.` 
        });
        return;
      }
    }

    try {
      setIsSaving(true);
      
      // Determine if this is a new or existing question
      const isNew = editingIndex === questions.length;
      
      if (isNew) {
        // Add new question
        const response = await fetch('/api/surveys/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': password,
          },
          body: JSON.stringify({
            action: 'add',
            question: editingQuestion,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setQuestions(data.questions.sort((a: any, b: any) => a.order - b.order));
          setMessage({ type: 'success', text: 'Question added' });
          setEditingQuestion(null);
          setEditingIndex(null);
          setFieldTypeValidation(null);
          setSchemaValidation(null);
          setFieldChangeImpact(null);
          setTimeout(() => setMessage(null), 2000);
        } else {
          throw new Error(data.error || 'Failed to add question');
        }
      } else {
        // Update existing question
        // Ensure ghlFieldMapping is included in updates (even if undefined)
        const updates = {
          ...editingQuestion,
          // Explicitly include ghlFieldMapping to ensure it's preserved or cleared
          ghlFieldMapping: editingQuestion.ghlFieldMapping,
        };
        
        console.log('💾 Saving question update with GHL mapping:', {
          id: editingQuestion.id,
          label: editingQuestion.label,
          ghlFieldMapping: editingQuestion.ghlFieldMapping,
          hasMapping: !!editingQuestion.ghlFieldMapping,
          updates,
        });
        
        const response = await fetch('/api/surveys/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': password,
          },
          body: JSON.stringify({
            action: 'update',
            id: editingQuestion.id,
            updates: updates,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setQuestions(data.questions.sort((a: any, b: any) => a.order - b.order));
          setMessage({ type: 'success', text: 'Question updated' });
          setEditingQuestion(null);
          setEditingIndex(null);
          setFieldTypeValidation(null);
          setSchemaValidation(null);
          setFieldChangeImpact(null);
          setShowImpactWarning(false);
          setTimeout(() => setMessage(null), 2000);
        } else {
          throw new Error(data.error || 'Failed to update question');
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to save question';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveQuestion = async (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];

    // Update orders
    newQuestions.forEach((q, idx) => {
      q.order = idx;
    });

    try {
      setIsSaving(true);
      const response = await fetch('/api/surveys/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({
          action: 'reorder',
          orders: newQuestions.map((q, idx) => ({ id: q.id, order: idx })),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions.sort((a: any, b: any) => a.order - b.order));
      } else {
        throw new Error(data.error || 'Failed to reorder questions');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to reorder questions';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Admin Survey Builder</CardTitle>
            <CardDescription>Enter your admin password to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button onClick={handleLogin} className="w-full">
                Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-pink-600" />
              <h1 className="text-3xl font-bold text-gray-900">Survey Builder</h1>
            </div>
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
          <p className="text-gray-600">Customize your cleaning quote survey questions</p>
        </motion.div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {message.text}
          </motion.div>
        )}

        {/* Questions List */}
        <div className="space-y-4 mb-8">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center">
                <LoadingDots size="lg" className="text-pink-600 mr-3" />
                Loading questions...
              </CardContent>
            </Card>
          ) : questions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No questions found. Click "Add Question" to create one.
              </CardContent>
            </Card>
          ) : (
            questions.map((question, index) => (
              <Card key={question.id} className="relative">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <GripVertical className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{question.label}</p>
                      <p className="text-sm text-gray-600">ID: {question.id} • Type: {question.type}</p>
                      {question.isCoreField && (
                        <p className="text-xs text-blue-600 mt-1">🔒 Core field (protected)</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditQuestion(index)}
                      >
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
            ))
          )}
        </div>

        {/* Add Question Button */}
        <Button onClick={handleAddQuestion} className="w-full mb-8" disabled={editingQuestion !== null}>
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>

        {/* Edit Panel */}
        <AnimatePresence>
          {editingQuestion && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto"
              onClick={() => setEditingQuestion(null)}
            >
              <Card className="w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
                <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b">
                  <div>
                    <CardTitle>Edit Question</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingQuestion(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <div className="overflow-y-auto max-h-[calc(100vh-220px)]">
                  <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Question ID (auto-generated)</Label>
                      <Input value={editingQuestion.id || ''} disabled className="bg-gray-100" />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={editingQuestion.type || 'text'}
                        onValueChange={async (value: any) => {
                          const oldQuestion = editingIndex !== null ? questions[editingIndex] : undefined;
                          setEditingQuestion({ ...editingQuestion, type: value });
                          
                          // Check impact if this is an existing question
                          if (editingIndex !== null && oldQuestion) {
                            await checkFieldChangeImpact(
                              editingQuestion.id || '',
                              oldQuestion,
                              { ...editingQuestion, type: value }
                            );
                          }
                          
                          // Re-validate field type when survey type changes
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
                      value={editingQuestion.label || ''}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, label: e.target.value })}
                      placeholder="What is your question?"
                    />
                  </div>

                  <div>
                    <Label>Placeholder (optional)</Label>
                    <Input
                      value={editingQuestion.placeholder || ''}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, placeholder: e.target.value })}
                      placeholder="e.g., Enter your answer here"
                    />
                  </div>

                  {editingQuestion.type === 'select' && (
                    <div>
                      <Label>Options</Label>
                      {CALCULATION_LOCKED_QUESTION_IDS.includes(editingQuestion.id ?? '') && (
                        <p className="text-xs text-gray-500 mb-2">
                          Values are used as keys for pricing and cannot be changed. You can edit labels only.
                        </p>
                      )}
                      {editingQuestion.id === 'squareFeet' && (
                        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          <p className="font-medium">Pricing mapping</p>
                          <p className="mt-1">
                            Option values (e.g. <code className="rounded bg-amber-100 px-1">1501-2000</code> or <code className="rounded bg-amber-100 px-1">0-1500</code>) are used to look up the pricing tier. The quote form uses each tool&apos;s pricing table when available; these survey options are the fallback. Keep values in sync with your pricing table ranges.
                          </p>
                        </div>
                      )}
                      {Array.isArray(editingQuestion.options) && editingQuestion.options.length > 0 && (
                        <div className="mb-3 flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              const newOptions = (editingQuestion.options ?? []).map((opt) => {
                                const o = { ...opt } as SurveyQuestionOption & { image_url?: string };
                                delete o.imageUrl;
                                delete o.image_url;
                                return o;
                              });
                              setEditingQuestion({ ...editingQuestion, options: newOptions });
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Remove all images from this question
                          </Button>
                        </div>
                      )}
                      <div className="space-y-2">
                        {(editingQuestion.options || []).map((option, idx) => {
                          const isCalculationLocked = CALCULATION_LOCKED_QUESTION_IDS.includes(editingQuestion.id ?? '');
                          return (
                          <div key={idx} className="relative flex flex-col gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 pr-10">
                            <div className="flex gap-2">
                              <Input
                                value={option.value}
                                onChange={(e) => {
                                  const newOptions = [...(editingQuestion.options || [])];
                                  newOptions[idx].value = e.target.value;
                                  setEditingQuestion({ ...editingQuestion, options: newOptions });
                                }}
                                placeholder="Value"
                                disabled={isCalculationLocked}
                                className={isCalculationLocked ? 'bg-gray-200 cursor-not-allowed' : ''}
                                title={isCalculationLocked ? 'Value is used as a key for pricing; only the label can be edited.' : undefined}
                              />
                              <Input
                                value={option.label}
                                onChange={(e) => {
                                  const newOptions = [...(editingQuestion.options || [])];
                                  newOptions[idx].label = e.target.value;
                                  setEditingQuestion({ ...editingQuestion, options: newOptions });
                                }}
                                placeholder="Label"
                              />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Option image (optional)</Label>
                                <p className="text-xs text-gray-500">Paste an image URL to show a picture for this option. Use &quot;Remove image&quot; to clear.</p>
                                {(option as SurveyQuestionOption).imageUrl?.trim() ? (
                                  <div className="flex flex-wrap items-start gap-3 p-2 rounded-lg border border-gray-200 bg-white">
                                    <div className="relative shrink-0">
                                      <img
                                        src={(option as SurveyQuestionOption).imageUrl}
                                        alt="Option preview"
                                        className="h-20 w-20 sm:h-24 sm:w-24 rounded-lg border border-gray-200 object-cover bg-gray-100"
                                        onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect fill="#f3f4f6" width="96" height="96"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="12">?</text></svg>'); }}
                                      />
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="absolute -top-1.5 -right-1.5 h-7 w-7 rounded-full shadow border border-gray-200 bg-white hover:bg-red-50 hover:text-red-600 p-0"
                                        onClick={() => {
                                          const newOptions = [...(editingQuestion.options || [])];
                                          const o = { ...newOptions[idx], imageUrl: undefined } as SurveyQuestionOption;
                                          newOptions[idx] = o;
                                          setEditingQuestion({ ...editingQuestion, options: newOptions });
                                        }}
                                        aria-label="Clear image"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    <div className="flex flex-col gap-1 min-w-0">
                                      <span className="text-xs font-medium text-gray-700">Image preview</span>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-fit h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          const newOptions = [...(editingQuestion.options || [])];
                                          const o = { ...newOptions[idx], imageUrl: undefined } as SurveyQuestionOption;
                                          newOptions[idx] = o;
                                          setEditingQuestion({ ...editingQuestion, options: newOptions });
                                        }}
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                                        Remove image
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}
                                <Input
                                  value={(option as SurveyQuestionOption).imageUrl ?? ''}
                                  onChange={(e) => {
                                    const newOptions = [...(editingQuestion.options || [])];
                                    const o = { ...newOptions[idx], imageUrl: e.target.value.trim() || undefined } as SurveyQuestionOption;
                                    newOptions[idx] = o;
                                    setEditingQuestion({ ...editingQuestion, options: newOptions });
                                  }}
                                  placeholder="https://... (image URL)"
                                  className="text-sm"
                                />
                                {((option as SurveyQuestionOption).imageUrl?.trim()) && (
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={(option as SurveyQuestionOption).showLabel !== false}
                                      onChange={(e) => {
                                        const newOptions = [...(editingQuestion.options || [])];
                                        const o = { ...newOptions[idx], showLabel: e.target.checked } as SurveyQuestionOption;
                                        newOptions[idx] = o;
                                        setEditingQuestion({ ...editingQuestion, options: newOptions });
                                      }}
                                      className="h-4 w-4 rounded border-gray-300"
                                    />
                                    <span className="text-xs">Show label with image</span>
                                  </label>
                                )}
                              </div>
                            <div>
                              <Label className="text-xs">Skip to question (optional):</Label>
                              <Select
                                value={option.skipToQuestionId || ''}
                                onValueChange={(value) => {
                                  const newOptions = [...(editingQuestion.options || [])];
                                  newOptions[idx].skipToQuestionId = value === 'next' ? undefined : value;
                                  setEditingQuestion({ ...editingQuestion, options: newOptions });
                                }}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="Select question to skip to" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px]">
                                  <SelectItem value="next">
                                    <span className="text-sm">→ Next Question</span>
                                  </SelectItem>
                                  <SelectItem value="__END__">
                                    <span className="text-sm">🏁 Skip to Quote Summary</span>
                                  </SelectItem>
                                  <SelectItem value="__DISQUALIFY__">
                                    <span className="text-sm">⚠️ Disqualify lead</span>
                                  </SelectItem>
                                  {questions
                                    .filter(q => q.order > (editingQuestion.order || 0))
                                    .sort((a, b) => a.order - b.order)
                                    .map((q) => (
                                      <SelectItem key={q.id} value={q.id}>
                                        <span className="text-sm">Q{q.order + 1}: {q.label.substring(0, 40)}</span>
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              {option.skipToQuestionId && (
                                <p className="text-xs text-blue-600 mt-1">
                                  ✓ Will skip to: {
                                    option.skipToQuestionId === '__END__'
                                      ? 'Quote Summary (End of Form)'
                                      : option.skipToQuestionId === '__DISQUALIFY__'
                                        ? 'Disqualify lead'
                                        : questions.find(q => q.id === option.skipToQuestionId)?.label
                                  }
                                </p>
                              )}
                            </div>
                            {!isCalculationLocked && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute bottom-2 right-2 h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  const newOptions = (editingQuestion.options || []).filter((_, i) => i !== idx);
                                  setEditingQuestion({ ...editingQuestion, options: newOptions });
                                }}
                                aria-label="Remove option"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                        })}
                        {!CALCULATION_LOCKED_QUESTION_IDS.includes(editingQuestion.id ?? '') && (
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
                        checked={editingQuestion.required || false}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                      />
                      <span className="text-sm">Required</span>
                    </label>
                  </div>

                  <div>
                    <Label>Field Mapping (optional)</Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Map this question to a GHL custom field or native field (firstName, lastName, email, phone)
                    </p>
                    <div className="relative">
                      <Select
                        value={editingQuestion.ghlFieldMapping || ''}
                        onValueChange={(value) => {
                          const newMapping = value === 'none' ? undefined : value;
                          setEditingQuestion({ 
                            ...editingQuestion, 
                            ghlFieldMapping: newMapping
                          });
                          // Validate field type when mapping changes
                          validateFieldMapping(editingQuestion.type || 'text', newMapping);
                        }}
                        onOpenChange={(open) => {
                          setGhlFieldDropdownOpen(open);
                          if (!open) {
                            setGhlFieldSearchTerm('');
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select HighLevel field (or leave blank)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {ghlFieldDropdownOpen && (
                            <div className="px-2 pb-2 sticky top-0 bg-white z-10">
                              <Input
                                placeholder="Search fields..."
                                value={ghlFieldSearchTerm}
                                onChange={(e) => setGhlFieldSearchTerm(e.target.value.toLowerCase())}
                                className="h-8 text-sm"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                          <SelectItem value="none">
                            <span className="text-gray-400">-- No mapping --</span>
                          </SelectItem>
                          {ghlFields
                            .filter((field) => {
                              if (!ghlFieldSearchTerm) return true;
                              const searchLower = ghlFieldSearchTerm.toLowerCase();
                              return (
                                field.name.toLowerCase().includes(searchLower) ||
                                field.key.toLowerCase().includes(searchLower)
                              );
                            })
                            .map((field) => (
                              <SelectItem key={field.key} value={field.key}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{field.name}</span>
                                  <span className="text-xs text-gray-500">
                                    {field.key} {field.type !== 'native' && `(${field.type})`}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Field Type Validation Display */}
                    {editingQuestion.ghlFieldMapping && (
                      <div className="mt-2 space-y-2">
                        {fieldTypeValidation?.valid ? (
                          <>
                            <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                              <p className="text-xs text-green-700 font-medium">
                                ✓ You can save this question
                              </p>
                              {fieldTypeValidation.ghlFieldType && (
                                <p className="text-xs text-green-600 mt-1">
                                  GHL field type: <strong>{fieldTypeValidation.ghlFieldType}</strong>
                                </p>
                              )}
                            </div>
                            {fieldTypeValidation.warning && (
                              <div className="p-2 bg-amber-50 border border-amber-300 rounded-lg">
                                <p className="text-xs text-amber-800 font-medium">⚠️ {fieldTypeValidation.warning}</p>
                              </div>
                            )}
                          </>
                        ) : fieldTypeValidation?.error ? (
                          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-xs text-red-700 font-medium">
                              ✗ Type mismatch!
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              {fieldTypeValidation.error}
                            </p>
                            {fieldTypeValidation.compatibleSurveyTypes && (
                              <p className="text-xs text-red-600 mt-1">
                                Compatible types: {fieldTypeValidation.compatibleSurveyTypes.join(', ')}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                    
                    {editingQuestion.ghlFieldMapping && !fieldTypeValidation?.error && (
                      <p className="text-xs text-green-600 mt-2">
                        ✓ Will map to GHL field: <strong>{editingQuestion.ghlFieldMapping}</strong>
                      </p>
                    )}
                  </div>
                </CardContent>
                </div>

                {/* Field Change Impact Warning */}
                {fieldChangeImpact && fieldChangeImpact.breaking && (
                  <div className="mx-6 my-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                    <p className="text-sm font-semibold text-red-900">⚠️ Breaking Change Detected</p>
                    <p className="text-xs text-red-700 mt-2">
                      This change would break the following systems:
                    </p>
                    <ul className="text-xs text-red-700 mt-1 ml-4 list-disc">
                      {fieldChangeImpact.impact.map((item: string, idx: number) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                    {fieldChangeImpact.affectedSystems && fieldChangeImpact.affectedSystems.length > 0 && (
                      <p className="text-xs text-red-700 mt-2">
                        Affected: {fieldChangeImpact.affectedSystems.join(', ')}
                      </p>
                    )}
                    <p className="text-xs text-red-800 mt-2 font-medium">
                      {fieldChangeImpact.recommendation}
                    </p>
                  </div>
                )}

                {/* Schema Validation Errors */}
                {schemaValidation && !schemaValidation.valid && schemaValidation.errors && schemaValidation.errors.length > 0 && (
                  <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm font-semibold text-red-900">❌ Validation Errors</p>
                    {schemaValidation.errors.map((error: any, idx: number) => (
                      <div key={idx} className="mt-2 text-xs">
                        <p className="text-red-800 font-medium">{error.message}</p>
                        <p className="text-red-700">{error.suggestion}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Schema Validation Warnings */}
                {schemaValidation && schemaValidation.warnings && schemaValidation.warnings.length > 0 && (
                  <div className="mx-6 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm font-semibold text-yellow-900">⚠️ Warnings</p>
                    {schemaValidation.warnings.map((warning: any, idx: number) => (
                      <div key={idx} className="mt-2 text-xs">
                        <p className="text-yellow-800 font-medium">{warning.message}</p>
                        <p className="text-yellow-700">{warning.suggestion}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 justify-end border-t pt-4 p-6">
                  <Button variant="outline" onClick={() => {
                    setEditingQuestion(null);
                    setShowImpactWarning(false);
                    setFieldChangeImpact(null);
                    setSchemaValidation(null);
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveQuestion} 
                    disabled={isSaving || (fieldChangeImpact && fieldChangeImpact.breaking) || (schemaValidation && !schemaValidation.valid)}
                    className={fieldChangeImpact && fieldChangeImpact.breaking ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {isSaving && <LoadingDots size="sm" className="mr-2 text-current" />}
                    {fieldChangeImpact && fieldChangeImpact.breaking ? 'Cannot Save - Breaking Change' : 'Save Question'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
