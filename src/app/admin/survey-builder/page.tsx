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
  ArrowLeft
} from 'lucide-react';
import { SurveyQuestion, SurveyQuestionOption } from '@/lib/kv';

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
    }
  }, [isAuthenticated]);

  const checkAuth = async (pass: string) => {
    try {
      const response = await fetch('/api/admin/survey-questions', {
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
      const response = await fetch('/api/admin/survey-questions', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (questions.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one question' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/survey-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ questions }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Survey questions saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Failed to save survey questions',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save survey questions. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: `question_${Date.now()}`,
      label: 'New Question',
      type: 'text',
      placeholder: 'Enter your answer',
      required: true,
      order: questions.length,
      options: [],
    };
    setQuestions([...questions, newQuestion]);
    setEditingIndex(questions.length);
    setEditingQuestion({ ...newQuestion });
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    // Reorder remaining questions
    const reordered = newQuestions.map((q, i) => ({ ...q, order: i }));
    setQuestions(reordered);
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingQuestion(null);
    } else if (editingIndex !== null && editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...questions];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newQuestions.length) return;

    // Swap questions
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    
    // Update order
    newQuestions.forEach((q, i) => {
      q.order = i;
    });

    setQuestions(newQuestions);
    
    // Update editing index if needed
    if (editingIndex === index) {
      setEditingIndex(newIndex);
    } else if (editingIndex === newIndex) {
      setEditingIndex(index);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditingQuestion({ ...questions[index] });
  };

  const saveEdit = () => {
    if (!editingQuestion || editingIndex === null) return;

    // Validate
    if (!editingQuestion.id || !editingQuestion.label) {
      setMessage({ type: 'error', text: 'Question ID and label are required' });
      return;
    }

    if (editingQuestion.type === 'select' && (!editingQuestion.options || editingQuestion.options.length === 0)) {
      setMessage({ type: 'error', text: 'Select questions must have at least one option' });
      return;
    }

    const newQuestions = [...questions];
    newQuestions[editingIndex] = {
      ...editingQuestion,
      order: editingIndex,
    } as SurveyQuestion;
    setQuestions(newQuestions);
    setEditingIndex(null);
    setEditingQuestion(null);
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingQuestion(null);
  };

  const addOption = () => {
    if (!editingQuestion) return;
    const newOptions = [...(editingQuestion.options || [])];
    newOptions.push({ value: '', label: '' });
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  const updateOption = (optionIndex: number, field: 'value' | 'label', value: string) => {
    if (!editingQuestion || !editingQuestion.options) return;
    const newOptions = [...editingQuestion.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  const removeOption = (optionIndex: number) => {
    if (!editingQuestion || !editingQuestion.options) return;
    const newOptions = editingQuestion.options.filter((_, i) => i !== optionIndex);
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto mt-20">
          <Card className="shadow-2xl border-2">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Admin Access</CardTitle>
              <CardDescription className="text-center">
                Enter your admin password to access survey builder
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
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            onClick={() => router.push('/admin')}
            variant="outline"
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-[#f61590]" />
            <h1 className="text-4xl font-bold text-gray-900">Survey Builder</h1>
          </div>
          <p className="text-gray-600">Create and customize your quote form questions</p>
        </motion.div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
            )}
            <p>{message.text}</p>
          </motion.div>
        )}

        <div className="flex justify-between items-center mb-6">
          <Button onClick={addQuestion} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || questions.length === 0}
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
                Save Questions
              </>
            )}
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#f61590]" />
            <p className="mt-4 text-gray-600">Loading questions...</p>
          </div>
        ) : questions.length === 0 ? (
          <Card className="shadow-xl border-2">
            <CardContent className="pt-12 pb-12 text-center">
              <Sparkles className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-600 mb-6">Get started by adding your first question</p>
              <Button onClick={addQuestion} className="flex items-center gap-2 mx-auto">
                <Plus className="h-4 w-4" />
                Add First Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {questions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="shadow-lg border-2">
                  <CardContent className="pt-6">
                    {editingIndex === index ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold">Editing Question</h3>
                          <Button
                            onClick={cancelEdit}
                            variant="ghost"
                            size="sm"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        <div>
                          <Label htmlFor="question-id">Question ID (unique identifier)</Label>
                          <Input
                            id="question-id"
                            value={editingQuestion?.id || ''}
                            onChange={(e) => setEditingQuestion({ ...editingQuestion, id: e.target.value })}
                            placeholder="e.g., firstName"
                            className="mt-1 font-mono"
                          />
                        </div>

                        <div>
                          <Label htmlFor="question-label">Question Label</Label>
                          <Input
                            id="question-label"
                            value={editingQuestion?.label || ''}
                            onChange={(e) => setEditingQuestion({ ...editingQuestion, label: e.target.value })}
                            placeholder="e.g., What's your first name?"
                            className="mt-1"
                          />
                        </div>

                        <div>
                          <Label htmlFor="question-type">Question Type</Label>
                          <Select
                            value={editingQuestion?.type || 'text'}
                            onValueChange={(value: any) => {
                              const updated = { ...editingQuestion, type: value };
                              if (value !== 'select') {
                                delete updated.options;
                              } else if (!updated.options) {
                                updated.options = [];
                              }
                              setEditingQuestion(updated);
                            }}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="tel">Phone</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="select">Select (Dropdown)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {editingQuestion?.type !== 'select' && (
                          <div>
                            <Label htmlFor="question-placeholder">Placeholder Text</Label>
                            <Input
                              id="question-placeholder"
                              value={editingQuestion?.placeholder || ''}
                              onChange={(e) => setEditingQuestion({ ...editingQuestion, placeholder: e.target.value })}
                              placeholder="e.g., John"
                              className="mt-1"
                            />
                          </div>
                        )}

                        {editingQuestion?.type === 'select' && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label>Options</Label>
                              <Button
                                onClick={addOption}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                Add Option
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {editingQuestion.options?.map((option, optIndex) => (
                                <div key={optIndex} className="flex gap-2">
                                  <Input
                                    placeholder="Value (e.g., weekly)"
                                    value={option.value}
                                    onChange={(e) => updateOption(optIndex, 'value', e.target.value)}
                                    className="flex-1 font-mono"
                                  />
                                  <Input
                                    placeholder="Label (e.g., Weekly)"
                                    value={option.label}
                                    onChange={(e) => updateOption(optIndex, 'label', e.target.value)}
                                    className="flex-1"
                                  />
                                  <Button
                                    onClick={() => removeOption(optIndex)}
                                    variant="ghost"
                                    size="sm"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="question-required"
                            checked={editingQuestion?.required ?? true}
                            onChange={(e) => setEditingQuestion({ ...editingQuestion, required: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="question-required" className="cursor-pointer">
                            Required field
                          </Label>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button onClick={saveEdit} className="flex-1">
                            Save Changes
                          </Button>
                          <Button onClick={cancelEdit} variant="outline">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col gap-1 pt-1">
                          <GripVertical className="h-5 w-5 text-gray-400" />
                          <Button
                            onClick={() => moveQuestion(index, 'up')}
                            variant="ghost"
                            size="sm"
                            disabled={index === 0}
                            className="h-6 p-0"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            onClick={() => moveQuestion(index, 'down')}
                            variant="ghost"
                            size="sm"
                            disabled={index === questions.length - 1}
                            className="h-6 p-0"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {question.label}
                              </h3>
                              <p className="text-sm text-gray-500 mt-1">
                                ID: <span className="font-mono">{question.id}</span> • Type: {question.type}
                                {question.required && <span className="text-red-500 ml-2">• Required</span>}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => startEditing(index)}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <Edit className="h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                onClick={() => deleteQuestion(index)}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {question.type === 'select' && question.options && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Options:</p>
                              <div className="space-y-1">
                                {question.options.map((option, optIndex) => (
                                  <div key={optIndex} className="text-sm text-gray-600">
                                    <span className="font-mono text-xs bg-white px-2 py-1 rounded">{option.value}</span>
                                    {' → '}
                                    <span>{option.label}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {question.placeholder && (
                            <p className="text-sm text-gray-500 mt-2">
                              Placeholder: <span className="italic">{question.placeholder}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
