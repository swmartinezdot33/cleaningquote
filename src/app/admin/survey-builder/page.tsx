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
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  RotateCw
} from 'lucide-react';
import { SurveyQuestion, SurveyQuestionOption } from '@/lib/survey/schema';

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
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
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

    // Validate
    if (!editingQuestion.label || !editingQuestion.id) {
      setMessage({ type: 'error', text: 'Label and ID are required' });
      return;
    }

    if (editingQuestion.type === 'select' && (!editingQuestion.options || editingQuestion.options.length === 0)) {
      setMessage({ type: 'error', text: 'Select questions must have at least one option' });
      return;
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
          setTimeout(() => setMessage(null), 2000);
        } else {
          throw new Error(data.error || 'Failed to add question');
        }
      } else {
        // Update existing question
        const response = await fetch('/api/surveys/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-password': password,
          },
          body: JSON.stringify({
            action: 'update',
            id: editingQuestion.id,
            updates: editingQuestion,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setQuestions(data.questions.sort((a: any, b: any) => a.order - b.order));
          setMessage({ type: 'success', text: 'Question updated' });
          setEditingQuestion(null);
          setEditingIndex(null);
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
                <Loader2 className="w-6 h-6 animate-spin text-pink-600 mr-3" />
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
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setEditingQuestion(null)}
            >
              <Card className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Edit Question</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEditingQuestion(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
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
                        onValueChange={(value: any) => {
                          setEditingQuestion({ ...editingQuestion, type: value });
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
                      <div className="space-y-2">
                        {(editingQuestion.options || []).map((option, idx) => (
                          <div key={idx} className="flex gap-2">
                            <Input
                              value={option.value}
                              onChange={(e) => {
                                const newOptions = [...(editingQuestion.options || [])];
                                newOptions[idx].value = e.target.value;
                                setEditingQuestion({ ...editingQuestion, options: newOptions });
                              }}
                              placeholder="Value"
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
                        checked={editingQuestion.required || false}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                      />
                      <span className="text-sm">Required</span>
                    </label>
                  </div>

                  <div>
                    <Label>GHL Field Mapping (optional)</Label>
                    <p className="text-xs text-gray-500 mb-2">
                      Map this question to a GHL custom field or native field (firstName, lastName, email, phone)
                    </p>
                    <div className="relative">
                      <Select
                        value={editingQuestion.ghlFieldMapping || ''}
                        onValueChange={(value) => {
                          setEditingQuestion({ 
                            ...editingQuestion, 
                            ghlFieldMapping: value === 'none' ? undefined : value 
                          });
                        }}
                        onOpenChange={(open) => {
                          setGhlFieldDropdownOpen(open);
                          if (!open) {
                            setGhlFieldSearchTerm('');
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select GHL field (or leave blank)" />
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
                    {editingQuestion.ghlFieldMapping && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Will map to GHL field: <strong>{editingQuestion.ghlFieldMapping}</strong>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setEditingQuestion(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveQuestion} disabled={isSaving}>
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Question
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
