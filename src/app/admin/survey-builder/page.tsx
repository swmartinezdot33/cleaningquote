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
      
      // Even if response is not ok, check if fields are included in the response
      // (the API returns fields even on some errors as fallback)
      if (data.fields && Array.isArray(data.fields)) {
        // Filter out any fields with empty or invalid keys
        const validFields = data.fields.filter((field: any) => 
          field && field.key && typeof field.key === 'string' && field.key.trim() !== ''
        );
        
        if (validFields.length > 0) {
          setGhlFields(validFields);
          console.log(`Loaded ${validFields.length} GHL fields (${validFields.filter((f: any) => f.type === 'native').length} native, ${validFields.filter((f: any) => f.fieldType === 'custom').length} custom)`);
        } else {
          // No valid fields, use fallback
          console.warn('No valid GHL fields found, using fallback native fields');
          setGhlFields([
            { key: 'firstName', name: 'First Name', type: 'native' },
            { key: 'lastName', name: 'Last Name', type: 'native' },
            { key: 'email', name: 'Email', type: 'native' },
            { key: 'phone', name: 'Phone', type: 'native' },
          ]);
        }
      } else {
        // No fields in response, use fallback
        console.warn('GHL fields API did not return fields array, using fallback');
        setGhlFields([
          { key: 'firstName', name: 'First Name', type: 'native' },
          { key: 'lastName', name: 'Last Name', type: 'native' },
          { key: 'email', name: 'Email', type: 'native' },
          { key: 'phone', name: 'Phone', type: 'native' },
        ]);
      }
      
      // Log errors but don't fail completely if fields were returned
      if (!response.ok && data.error) {
        console.error('GHL fields API error:', data.error, data.details);
      }
    } catch (error) {
      console.error('Failed to load GHL fields:', error);
      // Set default native fields as fallback
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

  const getDefaultQuestions = (): SurveyQuestion[] => {
    return [
      {
        id: 'firstName',
        label: "What's your first name?",
        type: 'text',
        placeholder: 'John',
        required: true,
        order: 0,
        ghlFieldMapping: 'firstName',
      },
      {
        id: 'lastName',
        label: "What's your last name?",
        type: 'text',
        placeholder: 'Doe',
        required: true,
        order: 1,
        ghlFieldMapping: 'lastName',
      },
      {
        id: 'email',
        label: "What's your email address?",
        type: 'email',
        placeholder: 'john@example.com',
        required: true,
        order: 2,
        ghlFieldMapping: 'email',
      },
      {
        id: 'phone',
        label: "What's your phone number?",
        type: 'tel',
        placeholder: '(555) 123-4567',
        required: true,
        order: 3,
        ghlFieldMapping: 'phone',
      },
      {
        id: 'squareFeet',
        label: "About how big is your home?",
        type: 'select',
        options: [
          { value: '500-1000', label: 'Under 1,000 sq ft' },
          { value: '1000-1500', label: '1,000 - 1,500 sq ft' },
          { value: '1500-2000', label: '1,500 - 2,000 sq ft' },
          { value: '2000-2500', label: '2,000 - 2,500 sq ft' },
          { value: '2500-3000', label: '2,500 - 3,000 sq ft' },
          { value: '3000-3500', label: '3,000 - 3,500 sq ft' },
          { value: '3500-4000', label: '3,500 - 4,000 sq ft' },
          { value: '4000-4500', label: '4,000 - 4,500 sq ft' },
          { value: '4500+', label: 'Over 4,500 sq ft' },
        ],
        required: true,
        order: 4,
      },
      {
        id: 'serviceType',
        label: 'Type of Cleaning Service Needed',
        type: 'select',
        options: [
          { value: 'general', label: 'General Clean' },
          { value: 'deep', label: 'Deep Clean' },
          { value: 'move-in', label: 'Move In Clean' },
          { value: 'move-out', label: 'Move Out Clean' },
          { value: 'recurring', label: 'Recurring Clean' },
        ],
        required: true,
        order: 5,
      },
      {
        id: 'frequency',
        label: 'How often would you like your home cleaned?',
        type: 'select',
        options: [
          { value: 'weekly', label: 'Weekly' },
          { value: 'bi-weekly', label: 'Bi-Weekly (Every 2 Weeks)' },
          { value: 'monthly', label: 'Monthly (Every 4 Weeks)' },
          { value: 'one-time', label: 'One-Time' },
        ],
        required: true,
        order: 6,
      },
      {
        id: 'fullBaths',
        label: 'How many full baths?',
        type: 'number',
        placeholder: '2',
        required: true,
        order: 7,
      },
      {
        id: 'halfBaths',
        label: 'How many half baths?',
        type: 'number',
        placeholder: '1',
        required: true,
        order: 8,
      },
      {
        id: 'bedrooms',
        label: 'How many bedrooms in the home?',
        type: 'number',
        placeholder: '3',
        required: true,
        order: 9,
      },
      {
        id: 'people',
        label: 'How many people live in the home?',
        type: 'number',
        placeholder: '2',
        required: true,
        order: 10,
      },
      {
        id: 'sheddingPets',
        label: 'How many shedding pets live in the home?',
        type: 'number',
        placeholder: '1',
        required: true,
        order: 11,
      },
      {
        id: 'condition',
        label: 'How would you describe the current condition of the home?',
        type: 'select',
        options: [
          { value: 'excellent', label: 'Excellent - Well maintained' },
          { value: 'good', label: 'Good - Generally clean' },
          { value: 'average', label: 'Average - Needs regular cleaning' },
          { value: 'poor', label: 'Poor - Needs deep cleaning' },
          { value: 'very-poor', label: 'Very Poor - Heavily soiled' },
        ],
        required: true,
        order: 12,
      },
    ];
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
        const loadedQuestions = data.questions || [];
        
        // If no questions exist, initialize with defaults
        if (loadedQuestions.length === 0) {
          const defaults = getDefaultQuestions();
          setQuestions(defaults);
          // Auto-save the defaults
          await saveQuestions(defaults);
        } else {
          setQuestions(loadedQuestions);
        }
      }
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveQuestions = async (questionsToSave: SurveyQuestion[]) => {
    try {
      const response = await fetch('/api/admin/survey-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password,
        },
        body: JSON.stringify({ questions: questionsToSave }),
      });

      if (!response.ok) {
        throw new Error('Failed to save questions');
      }
    } catch (error) {
      console.error('Failed to save questions:', error);
      throw error;
    }
  };

  const initializeWithDefaults = async () => {
    const defaults = getDefaultQuestions();
    setQuestions(defaults);
    await saveQuestions(defaults);
    setMessage({ type: 'success', text: 'Initialized with default questions!' });
    setTimeout(() => setMessage(null), 3000);
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

    // Check for duplicate IDs (excluding the current question being edited)
    const duplicateId = questions.some((q, index) => 
      q.id === editingQuestion.id && index !== editingIndex
    );
    
    if (duplicateId) {
      setMessage({ type: 'error', text: `A question with ID "${editingQuestion.id}" already exists. Please use a unique ID.` });
      return;
    }

    if (editingQuestion.type === 'select' && (!editingQuestion.options || editingQuestion.options.length === 0)) {
      setMessage({ type: 'error', text: 'Select questions must have at least one option' });
      return;
    }

    // Warn if changing field type of a core field
    const originalQuestion = questions[editingIndex];
    const coreFields = ['firstName', 'lastName', 'email', 'phone', 'address'];
    if (coreFields.includes(originalQuestion.id) && originalQuestion.type !== editingQuestion.type) {
      console.warn(`⚠️ Warning: Changed field type for "${originalQuestion.id}" from "${originalQuestion.type}" to "${editingQuestion.type}". This may affect form validation.`);
    }

    const newQuestions = [...questions];
    // Clean up ghlFieldMapping - remove if empty or undefined
    const cleanedGhlFieldMapping = editingQuestion.ghlFieldMapping && editingQuestion.ghlFieldMapping.trim() !== ''
      ? editingQuestion.ghlFieldMapping.trim()
      : undefined;
    
    newQuestions[editingIndex] = {
      ...editingQuestion,
      ghlFieldMapping: cleanedGhlFieldMapping,
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
              <p className="text-gray-600 mb-6">Initialize with default questions or start building your own</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={initializeWithDefaults} className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Load Default Questions
                </Button>
                <Button onClick={addQuestion} variant="outline" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Question
                </Button>
              </div>
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
                          <p className="text-xs text-gray-500 mt-1">
                            Must be unique. Used as form field name.
                          </p>
                          {questions.some((q, i) => q.id === editingQuestion?.id && i !== editingIndex) && (
                            <p className="text-xs text-red-500 mt-1 font-semibold">
                              ⚠️ This ID already exists! Please use a unique ID.
                            </p>
                          )}
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
                          {['firstName', 'lastName', 'email', 'phone', 'address'].includes(editingQuestion?.id || '') && 
                           questions[editingIndex]?.type !== editingQuestion?.type && (
                            <p className="text-xs text-orange-600 mt-1 font-semibold">
                              ⚠️ Changing the type of this core field may affect form functionality.
                            </p>
                          )}
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

                        <div>
                          <Label htmlFor="ghl-field-mapping">Map to GHL Field (Optional)</Label>
                          <p className="text-sm text-gray-500 mt-1 mb-2">
                            Select where this question's answer should be saved in GoHighLevel
                          </p>
                          {isLoadingFields ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading GHL fields...
                            </div>
                          ) : (
                            <>
                              <Select
                                value={editingQuestion?.ghlFieldMapping && editingQuestion.ghlFieldMapping.trim() !== '' 
                                  ? editingQuestion.ghlFieldMapping 
                                  : 'none'}
                                onValueChange={(value) => {
                                  setEditingQuestion({ 
                                    ...editingQuestion, 
                                    ghlFieldMapping: value === 'none' ? undefined : value
                                  });
                                  setGhlFieldSearchTerm(''); // Clear search after selection
                                  setGhlFieldDropdownOpen(false);
                                }}
                                open={ghlFieldDropdownOpen}
                                onOpenChange={setGhlFieldDropdownOpen}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder="No mapping (data won't be sent to GHL)" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ghlFieldDropdownOpen && (
                                    <div className="p-2 border-b">
                                      <Input
                                        placeholder="Search fields..."
                                        value={ghlFieldSearchTerm}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          setGhlFieldSearchTerm(e.target.value);
                                        }}
                                        className="h-8"
                                        autoFocus
                                      />
                                    </div>
                                  )}
                                  <SelectItem value="none">No mapping</SelectItem>
                                  {ghlFields
                                    .filter(field => field.key && field.key.trim() !== '')
                                    .filter(field => 
                                      ghlFieldSearchTerm === '' ||
                                      field.name.toLowerCase().includes(ghlFieldSearchTerm.toLowerCase()) ||
                                      field.key.toLowerCase().includes(ghlFieldSearchTerm.toLowerCase())
                                    )
                                    .map((field) => (
                                      <SelectItem key={field.key} value={field.key}>
                                        {field.name} {field.type === 'native' ? '(Native)' : field.fieldType === 'custom' ? '(Custom)' : ''}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <div className="mt-2 flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                  {ghlFields.length > 0 ? (
                                    <>
                                      {ghlFields.filter(f => f.type === 'native').length} native,{' '}
                                      {ghlFields.filter(f => f.fieldType === 'custom').length} custom fields loaded
                                    </>
                                  ) : (
                                    'No GHL fields available. Check your GHL connection in Settings.'
                                  )}
                                </p>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={loadGHLFields}
                                  className="h-6 text-xs"
                                >
                                  <RotateCw className="h-3 w-3 mr-1" />
                                  Refresh
                                </Button>
                              </div>
                            </>
                          )}
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
                                {question.ghlFieldMapping && (
                                  <span className="text-blue-600 ml-2">
                                    • Maps to: <span className="font-semibold">
                                      {ghlFields.find(f => f.key === question.ghlFieldMapping)?.name || question.ghlFieldMapping}
                                    </span>
                                  </span>
                                )}
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
