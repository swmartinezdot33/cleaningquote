'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Copy, ChevronLeft, ChevronRight, Sparkles, Calendar, Clock, Loader2, Check } from 'lucide-react';
import { SurveyQuestion } from '@/lib/kv';
import { GooglePlacesAutocomplete, PlaceDetails } from '@/components/GooglePlacesAutocomplete';

/**
 * Convert a select value (including "5+") to a number
 */
function convertSelectToNumber(value: string): number {
  if (!value) return 0;
  if (value === '5+') return 5; // Use 5 as the minimum for "5+"
  const num = parseInt(value, 10);
  return !isNaN(num) ? num : 0;
}

/**
 * Convert square footage range string to numeric value (use upper bound - 1 for better matching)
 */
function convertSquareFootageToNumber(rangeString: string): number {
  if (!rangeString) return 1500; // default
  
  // Handle ranges like '500-1000', '1000-1500', etc.
  if (rangeString.includes('-')) {
    const parts = rangeString.split('-');
    if (rangeString.includes('4500+')) return 4500; // upper bound for 4500+
    const min = parseInt(parts[0], 10) || 0;
    const max = parseInt(parts[1], 10) || min;
    // Use upper bound - 1 to ensure we stay within this range tier
    return max - 1;
  }
  
  // Try to parse as direct number
  const num = parseInt(rangeString, 10);
  return !isNaN(num) ? num : 1500;
}

/**
 * Sanitize field ID for React Hook Form (replace dots with underscores)
 */
function sanitizeFieldId(id: string): string {
  return id.replace(/\./g, '_');
}

/**
 * Get the form field name (sanitized) from question ID
 */
function getFormFieldName(questionId: string): string {
  return sanitizeFieldId(questionId);
}

/**
 * Generate dynamic zod schema from survey questions
 */
function generateSchemaFromQuestions(questions: SurveyQuestion[]): z.ZodObject<any> {
  const schemaShape: Record<string, z.ZodTypeAny> = {};

  questions.forEach((question) => {
    // Sanitize the field ID for use in the schema
    const fieldId = getFormFieldName(question.id);
    
    if (question.type === 'number') {
      schemaShape[fieldId] = question.required
        ? z.number({ required_error: `${question.label} is required` }).int().min(0, `${question.label} must be 0 or greater`)
        : z.number().int().min(0).optional();
    } else if (question.type === 'email') {
      schemaShape[fieldId] = question.required
        ? z.string().min(1, `${question.label} is required`).email('Valid email is required')
        : z.string().email().optional();
    } else if (question.type === 'tel') {
      schemaShape[fieldId] = question.required
        ? z.string().min(10, 'Valid phone number is required')
        : z.string().optional();
    } else if (question.type === 'select') {
      if (question.required) {
        schemaShape[fieldId] = z.string()
          .min(1, `Please select ${question.label.toLowerCase()}`)
          .transform(val => val?.trim() || '')
          .refine(val => val.length > 0, { message: `Please select ${question.label.toLowerCase()}` });
      } else {
        schemaShape[fieldId] = z.string().optional().nullable();
      }
    } else if (question.type === 'address') {
      schemaShape[fieldId] = question.required
        ? z.string().min(1, `${question.label} is required`)
        : z.string().optional();
    } else {
      // text type
      schemaShape[fieldId] = question.required
        ? z.string().min(1, `${question.label} is required`)
        : z.string().optional();
    }
  });

  return z.object(schemaShape);
}

interface QuoteResponse {
  outOfLimits: boolean;
  message?: string;
  multiplier?: number;
  initialCleaningRequired?: boolean;
  inputs?: {
    squareFeet: number;
    people: number;
    pets: number;
    sheddingPets: number;
  };
  ranges?: {
    initial: { low: number; high: number };
    weekly: { low: number; high: number };
    biWeekly: { low: number; high: number };
    fourWeek: { low: number; high: number };
    general: { low: number; high: number };
    deep: { low: number; high: number };
    moveInOutBasic: { low: number; high: number };
    moveInOutFull: { low: number; high: number };
  };
  summaryText?: string;
  smsText?: string;
  ghlContactId?: string;
}

// Default questions (fallback if none are configured)
const defaultQuestions: SurveyQuestion[] = [
  {
    id: 'firstName',
    label: "What's your first name?",
    type: 'text',
    placeholder: 'John',
    required: true,
    order: 0,
  },
  {
    id: 'lastName',
    label: "What's your last name?",
    type: 'text',
    placeholder: 'Doe',
    required: true,
    order: 1,
  },
  {
    id: 'email',
    label: "What's your email address?",
    type: 'email',
    placeholder: 'john@example.com',
    required: true,
    order: 2,
  },
  {
    id: 'phone',
    label: "What's your phone number?",
    type: 'tel',
    placeholder: '(555) 123-4567',
    required: true,
    order: 3,
  },
  {
    id: 'address',
    label: "What's your service address?",
    type: 'address',
    placeholder: 'Enter your address',
    required: true,
    order: 4,
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
    order: 5,
  },
  {
    id: 'serviceType',
    label: 'Type of Cleaning Service Needed',
    type: 'select',
    options: [
      { value: 'initial', label: 'Initial Cleaning (First deep clean to reach maintenance standards)' },
      { value: 'general', label: 'General Clean (For switching services - good condition homes)' },
      { value: 'deep', label: 'Deep Clean (Very thorough - wet wipe everything)' },
      { value: 'move-in', label: 'Move In Clean' },
      { value: 'move-out', label: 'Move Out Clean' },
      { value: 'recurring', label: 'Recurring Clean' },
    ],
    required: true,
    order: 6,
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
    order: 7,
  },
  {
    id: 'fullBaths',
    label: 'How many full baths?',
    type: 'number',
    placeholder: '2',
    required: true,
    order: 8,
  },
  {
    id: 'halfBaths',
    label: 'How many half baths?',
    type: 'select',
    options: [
      { value: '0', label: '0' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5+', label: '5+' },
    ],
    required: true,
    order: 9,
  },
  {
    id: 'bedrooms',
    label: 'How many bedrooms in the home?',
    type: 'number',
    placeholder: '3',
    required: true,
    order: 10,
  },
  {
    id: 'people',
    label: 'How many people live in the home?',
    type: 'number',
    placeholder: '2',
    required: true,
    order: 11,
  },
  {
    id: 'sheddingPets',
    label: 'How many shedding pets live in the home?',
    type: 'select',
    options: [
      { value: '0', label: '0' },
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5+', label: '5+' },
    ],
    required: true,
    order: 12,
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
    order: 13,
  },
  {
    id: 'hasPreviousService',
    label: 'Have you had cleaning service before?',
    type: 'select',
    options: [
      { value: 'true', label: 'Yes, I currently have or recently had service' },
      { value: 'false', label: 'No, this is my first time' },
      { value: 'switching', label: 'Yes, but I\'m switching providers (not happy with previous service)' },
    ],
    required: true,
    order: 14,
  },
  {
    id: 'cleanedWithin3Months',
    label: 'Has your home been professionally cleaned within the last 3 months?',
    type: 'select',
    options: [
      { value: 'yes', label: 'Yes, within the last 3 months' },
      { value: 'no', label: 'No, not within the last 3 months' },
      { value: 'unsure', label: 'Not sure / Cannot remember' },
    ],
    required: true,
    order: 15,
  },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [direction, setDirection] = useState(1); // 1 for forward, -1 for backward
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [callDate, setCallDate] = useState('');
  const [callTime, setCallTime] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  const [isBookingCall, setIsBookingCall] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [appointmentConfirmed, setAppointmentConfirmed] = useState(false);
  const [callConfirmed, setCallConfirmed] = useState(false);
  const [widgetTitle, setWidgetTitle] = useState('Raleigh Cleaning Company');
  const [widgetSubtitle, setWidgetSubtitle] = useState("Let's get your professional cleaning price!");
  const [primaryColor, setPrimaryColor] = useState('#f61590');
  const [questions, setQuestions] = useState<SurveyQuestion[]>(defaultQuestions);
  const [quoteSchema, setQuoteSchema] = useState<z.ZodObject<any>>(generateSchemaFromQuestions(defaultQuestions));
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [serviceAreaChecked, setServiceAreaChecked] = useState(false);
  const [formSettings, setFormSettings] = useState<any>({});

  useEffect(() => {
    setMounted(true);
    loadWidgetSettings();
    loadSurveyQuestions();
    loadFormSettings();
  }, []);

  // Update document title when widgetTitle changes
  useEffect(() => {
    if (widgetTitle) {
      document.title = widgetTitle;
    }
  }, [widgetTitle]);

  const loadSurveyQuestions = async () => {
    try {
      const response = await fetch('/api/survey-questions');
      if (response.ok) {
        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
          // Always sort by order to ensure consistent display
          let sortedQuestions = [...data.questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          
          // Fix squareFeet if it's not a select or missing options
          sortedQuestions = sortedQuestions.map(q => {
            if (q.id === 'squareFeet' && (q.type !== 'select' || !q.options || q.options.length === 0)) {
              return {
                ...q,
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
              };
            }
            return q;
          });
          
          setQuestions(sortedQuestions);
          setQuoteSchema(generateSchemaFromQuestions(sortedQuestions));
        }
      }
    } catch (error) {
      console.error('Failed to load survey questions:', error);
      // Use default questions on error
    }
  };

  // Auto-focus input when step changes
  useEffect(() => {
    if (mounted && currentQuestion) {
      // Small delay to ensure the animation has started and input is rendered
      const timer = setTimeout(() => {
        if (currentQuestion.type === 'select') {
          // For select fields, try to focus the trigger button
          // The SelectTrigger might not have the ID, so we look for the button inside the card
          const selectTrigger = document.querySelector(`[role="combobox"]`) as HTMLButtonElement;
          if (selectTrigger) {
            selectTrigger.focus();
          }
        } else {
          // For input fields, focus by ID
          const inputElement = document.getElementById(currentQuestion.id) as HTMLInputElement;
          if (inputElement) {
            inputElement.focus();
            // Also select the text if there's a value, so user can easily replace it
            if (inputElement.value) {
              inputElement.select();
            }
          }
        }
      }, 300); // Delay to allow animation to complete and DOM to update

      return () => clearTimeout(timer);
    }
  }, [currentStep, mounted]);

  const loadFormSettings = async () => {
    try {
      const response = await fetch('/api/form-settings');
      if (response.ok) {
        const data = await response.json();
        setFormSettings(data.formSettings || {});
      }
    } catch (error) {
      console.error('Failed to load form settings:', error);
    }
  };

  // Auto-focus input when step changes
  const loadWidgetSettings = async () => {
    try {
      const response = await fetch('/api/admin/widget-settings');
      if (response.ok) {
        const data = await response.json();
        setWidgetTitle(data.title || 'Raleigh Cleaning Company');
        setWidgetSubtitle(data.subtitle || "Let's get your professional cleaning price!");
        setPrimaryColor(data.primaryColor || '#f61590');
      }
    } catch (error) {
      console.error('Failed to load widget settings:', error);
    }
  };

  // Helper function to convert hex color to rgba
  const hexToRgba = (hex: string, alpha: number = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Helper function to convert hex to HSL for Tailwind CSS variables
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }

    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);

    return `${h} ${s}% ${l}%`;
  };

  // Generate default values from questions
  const getDefaultValues = () => {
    const defaults: Record<string, any> = {};
    questions.forEach((q) => {
      const fieldName = getFormFieldName(q.id);
      if (q.type === 'number') {
        defaults[fieldName] = 0;
      } else {
        defaults[fieldName] = '';
      }
    });

    // Apply query parameters if they are configured
    if (typeof window !== 'undefined' && mounted) {
      const params = new URLSearchParams(window.location.search);

      // Map query parameter values to form fields based on admin config
      const paramMap: Record<string, string> = {
        firstName: formSettings.firstNameParam,
        lastName: formSettings.lastNameParam,
        email: formSettings.emailParam,
        phone: formSettings.phoneParam,
        address: formSettings.addressParam,
      };

      Object.entries(paramMap).forEach(([fieldId, paramName]) => {
        if (paramName) {
          const value = params.get(paramName);
          if (value) {
            defaults[fieldId] = value;
          }
        }
      });
    }

    return defaults;
  };

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    trigger,
    getValues,
    reset,
  } = useForm({
    resolver: zodResolver(quoteSchema),
    defaultValues: getDefaultValues(),
  });

  // Reset form when questions or formSettings change (to apply query parameters)
  useEffect(() => {
    reset(getDefaultValues());
  }, [questions, formSettings, mounted]);

  // Detect browser autofill and auto-advance
  useEffect(() => {
    const currentQuestion = questions[currentStep];
    if (!mounted || !currentQuestion) return;
    
    // Only detect autofill for text, email, and tel input types (not address since it has autocomplete)
    if (!['text', 'email', 'tel'].includes(currentQuestion.type)) return;

    const inputElement = document.getElementById(currentQuestion.id) as HTMLInputElement;
    if (!inputElement) return;

    let lastValue = inputElement.value || '';
    let autofillTimeout: NodeJS.Timeout | null = null;
    let hasUserTyped = false;

    // Track if user is typing (to avoid false positives)
    const handleInput = () => {
      hasUserTyped = true;
    };

    const handleChange = () => {
      // If value changed and user didn't type, it's likely autofill
      if (!hasUserTyped && inputElement.value && inputElement.value.trim() !== '' && inputElement.value !== lastValue) {
        // Clear any existing timeout
        if (autofillTimeout) {
          clearTimeout(autofillTimeout);
        }
        
        // Wait a moment to ensure autofill is complete, then advance
        autofillTimeout = setTimeout(() => {
          if (inputElement.value && inputElement.value.trim() !== '') {
            // Validate and move to next step or submit if last question
            trigger(currentQuestion.id as any).then((isValid) => {
              if (isValid) {
                if (currentStep < questions.length - 1) {
                  setDirection(1);
                  setCurrentStep(currentStep + 1);
                } else {
                  // Last question - submit the form by pressing the "Get Quote" button
                  const nextButton = document.querySelector('[class*="flex"][class*="justify-between"] button:last-child');
                  if (nextButton instanceof HTMLButtonElement) {
                    nextButton.click();
                  }
                }
              }
            });
          }
        }, 600);
      }
      lastValue = inputElement.value;
      hasUserTyped = false;
    };

    // Also check periodically for autofill (some browsers don't fire change events)
    const checkInterval = setInterval(() => {
      if (inputElement.value && inputElement.value !== lastValue && inputElement.value.trim() !== '' && !hasUserTyped) {
        // Input is focused and value appeared - likely autofill
        if (document.activeElement === inputElement) {
          if (autofillTimeout) {
            clearTimeout(autofillTimeout);
          }
          autofillTimeout = setTimeout(() => {
            if (inputElement.value && inputElement.value.trim() !== '') {
              trigger(currentQuestion.id as any).then((isValid) => {
                if (isValid) {
                  if (currentStep < questions.length - 1) {
                    setDirection(1);
                    setCurrentStep(currentStep + 1);
                  } else {
                    // Last question - submit the form by pressing the "Get Quote" button
                    const nextButton = document.querySelector('[class*="flex"][class*="justify-between"] button:last-child');
                    if (nextButton instanceof HTMLButtonElement) {
                      nextButton.click();
                    }
                  }
                }
              });
            }
          }, 600);
        }
        lastValue = inputElement.value;
      }
    }, 300);

    inputElement.addEventListener('input', handleInput);
    inputElement.addEventListener('change', handleChange);

    // Cleanup
    return () => {
      inputElement.removeEventListener('input', handleInput);
      inputElement.removeEventListener('change', handleChange);
      if (autofillTimeout) {
        clearTimeout(autofillTimeout);
      }
      clearInterval(checkInterval);
    };
  }, [currentStep, mounted, trigger, questions, setDirection, setCurrentStep]);

  const progress = ((currentStep + 1) / questions.length) * 100;

  if (!mounted) {
    return (
      <main 
        className="min-h-screen bg-gradient-to-br via-white pt-12 pb-20 px-4 sm:px-6 lg:px-8"
        style={{ 
          backgroundImage: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.05)} 0%, transparent 50%, ${hexToRgba(primaryColor, 0.05)} 100%)`
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h1 
            className="text-5xl font-bold bg-clip-text text-transparent mb-4"
            style={{
              backgroundImage: `linear-gradient(to right, ${primaryColor}, ${hexToRgba(primaryColor, 0.7)})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {widgetTitle}
          </h1>
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  const nextStep = async () => {
    const currentQuestion = questions[currentStep];
    if (!currentQuestion) {
      console.error('Current question not found at step', currentStep);
      return;
    }
    
    // Use sanitized field name for validation
    const fieldName = getFormFieldName(currentQuestion.id);
    const isValid = await trigger(fieldName as any);
    
    if (!isValid) {
      const currentValue = getValues(fieldName as any);
      const fieldError = (errors as any)[fieldName]?.message;
      console.warn('Validation failed for:', fieldName, '(original ID:', currentQuestion.id + ')', 'Current value:', currentValue);
      console.warn('Field error:', fieldError);
      return;
    }
    
    if (isValid) {
      // Check if this is an address question - if so, check service area
      if (currentQuestion.type === 'address' && addressCoordinates && !serviceAreaChecked) {
        setIsLoading(true);
        try {
          const response = await fetch('/api/service-area/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: addressCoordinates.lat,
              lng: addressCoordinates.lng,
            }),
          });

          const result = await response.json();

          if (!result.inServiceArea) {
            // Out of service area - create contact and redirect
            const data = getValues();
            const addressFieldName = getFormFieldName(currentQuestion.id);
            try {
              await fetch('/api/service-area/out-of-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  firstName: data.firstName,
                  lastName: data.lastName,
                  email: data.email,
                  phone: data.phone,
                  address: data.address || data[addressFieldName],
                }),
              });
            } catch (error) {
              console.error('Error creating out-of-service contact:', error);
            }

            // Redirect to out-of-service page
            const params = new URLSearchParams({
              data: JSON.stringify({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
                phone: data.phone,
                address: data.address || data[addressFieldName],
              }),
            });
            window.location.href = `/out-of-service?${params.toString()}`;
            return;
          }

          setServiceAreaChecked(true);
        } catch (error) {
          console.error('Error checking service area:', error);
          // Continue anyway if service area check fails
          setServiceAreaChecked(true);
        } finally {
          setIsLoading(false);
        }
      }

      setDirection(1);
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleFormSubmit();
      }
    }
  };

  const prevStep = () => {
    setDirection(-1);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFormSubmit = async () => {
    setIsLoading(true);
    setQuoteResult(null);
    setCopySuccess(false);

    try {
      const formData = getValues();
      
      // Create a map of sanitized names back to original question IDs for custom fields
      const fieldMap: Record<string, string> = {};
      questions.forEach(q => {
        const sanitized = getFormFieldName(q.id);
        if (sanitized !== q.id) {
          fieldMap[sanitized] = q.id;
        }
      });

      // Build the API payload, mapping sanitized fields back to original IDs
      const apiPayload: any = {
        firstName: formData.firstName || formData.first_name,
        lastName: formData.lastName || formData.last_name,
        email: formData.email,
        phone: formData.phone,
        serviceType: formData.serviceType,
        frequency: formData.frequency,
        // Convert square footage range to numeric value
        squareFeet: convertSquareFootageToNumber(formData.squareFeet),
        fullBaths: Number(formData.fullBaths),
        halfBaths: convertSelectToNumber(formData.halfBaths),
        bedrooms: Number(formData.bedrooms),
        people: Number(formData.people),
        pets: Number(formData.sheddingPets),
        sheddingPets: convertSelectToNumber(formData.sheddingPets),
        condition: formData.condition,
        hasPreviousService: formData.hasPreviousService === 'true' || formData.hasPreviousService === 'switching',
        cleanedWithin3Months: formData.cleanedWithin3Months === 'yes',
      };

      // Add any custom fields (those that were sanitized)
      Object.entries(fieldMap).forEach(([sanitized, original]) => {
        if (formData[sanitized] !== undefined) {
          apiPayload[original] = formData[sanitized];
        }
      });

      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to calculate quote');
      }

      const result = await response.json();
      setQuoteResult(result);
    } catch (error) {
      console.error('Error fetching quote:', error);
      alert(error instanceof Error ? error.message : 'Failed to calculate quote. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (quoteResult?.smsText) {
      try {
        await navigator.clipboard.writeText(quoteResult.smsText);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy:', error);
        alert('Failed to copy text. Please select and copy manually.');
      }
    }
  };

  const handleBookAppointment = async () => {
    if (!appointmentDate || !appointmentTime) {
      setBookingMessage({ type: 'error', text: 'Please select a date and time' });
      return;
    }

    if (!quoteResult?.ghlContactId) {
      setBookingMessage({
        type: 'error',
        text: 'Unable to book appointment - contact information not available',
      });
      return;
    }

    setIsBookingAppointment(true);
    setBookingMessage(null);

    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: quoteResult.ghlContactId,
          date: appointmentDate,
          time: appointmentTime,
          notes: appointmentNotes || 'Appointment booked through quote form',
          type: 'appointment',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBookingMessage({ type: 'success', text: 'Appointment booked successfully!' });
        setAppointmentConfirmed(true);
        setShowAppointmentForm(false);
        setTimeout(() => {
          setAppointmentDate('');
          setAppointmentTime('');
          setAppointmentNotes('');
        }, 1000);
      } else {
        setBookingMessage({
          type: 'error',
          text: data.error || 'Failed to book appointment',
        });
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      setBookingMessage({
        type: 'error',
        text: 'Failed to book appointment. Please try again.',
      });
    } finally {
      setIsBookingAppointment(false);
    }
  };

  const handleBookCall = async () => {
    if (!callDate || !callTime) {
      setBookingMessage({ type: 'error', text: 'Please select a date and time' });
      return;
    }

    if (!quoteResult?.ghlContactId) {
      setBookingMessage({
        type: 'error',
        text: 'Unable to book call - contact information not available',
      });
      return;
    }

    setIsBookingCall(true);
    setBookingMessage(null);

    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactId: quoteResult.ghlContactId,
          date: callDate,
          time: callTime,
          notes: callNotes || 'Call scheduled through quote form',
          type: 'call',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBookingMessage({ type: 'success', text: 'Call scheduled successfully!' });
        setCallConfirmed(true);
        setShowCallForm(false);
        setTimeout(() => {
          setCallDate('');
          setCallTime('');
          setCallNotes('');
        }, 1000);
      } else {
        setBookingMessage({
          type: 'error',
          text: data.error || 'Failed to schedule call',
        });
      }
    } catch (error) {
      console.error('Error scheduling call:', error);
      setBookingMessage({
        type: 'error',
        text: 'Failed to schedule call. Please try again.',
      });
    } finally {
      setIsBookingCall(false);
    }
  };

  const currentQuestion = questions[currentStep];

  if (quoteResult) {
    return (
      <div style={{ '--primary-color': primaryColor, '--primary': hexToHsl(primaryColor) } as React.CSSProperties}>
        <style>{`
          :root {
            --primary-color: ${primaryColor};
            --primary: ${hexToHsl(primaryColor)};
            --ring: ${hexToHsl(primaryColor)};
          }
          .primary-from { background: linear-gradient(to right, var(--primary-color), ${hexToRgba(primaryColor, 0.6)}); }
          .primary-bg { background-color: var(--primary-color); }
          .primary-text { color: var(--primary-color); }
          .primary-border { border-color: var(--primary-color); }
        `}</style>
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pt-12 pb-20 px-4 sm:px-6 lg:px-8"
              style={{ 
                backgroundImage: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.05)} 0%, transparent 50%, ${hexToRgba(primaryColor, 0.05)} 100%)`
              }}>
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
            {quoteResult.outOfLimits ? (
              <Card className="shadow-2xl border-2">
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Out of Limits</h2>
                    <p className="text-gray-700 mb-6">{quoteResult.message}</p>
                    <Button onClick={() => setQuoteResult(null)}>Go Back and Edit</Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Quote Summary Header */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-8"
                >
                  <h2 className="text-4xl font-bold text-gray-900 mb-2">Your Perfect Quote</h2>
                  <p className="text-xl text-gray-600">
                    Professional cleaning, personalized pricing
                  </p>
                </motion.div>

                {/* Beautiful Quote Card */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="shadow-2xl border-0 overflow-hidden">
                    <div 
                      className="p-8 text-white"
                      style={{
                        background: `linear-gradient(to right, ${primaryColor}, ${hexToRgba(primaryColor, 0.8)})`
                      }}
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-2xl font-bold">Your Quote</h3>
                        <Sparkles className="h-8 w-8 opacity-80" />
                      </div>
                    </div>
                    <CardContent className="pt-8">
                      <pre className="whitespace-pre-wrap font-sans text-base text-gray-700 leading-relaxed">
                        {quoteResult.summaryText}
                      </pre>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Two CTAs - Book Appointment and Book a Call */}
                {quoteResult?.ghlContactId && !appointmentConfirmed && !callConfirmed && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {/* Book Appointment CTA */}
                    <Button
                      onClick={() => setShowAppointmentForm(!showAppointmentForm)}
                      className="h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
                    >
                      📅 Book an Appointment
                    </Button>

                    {/* Book a Call CTA */}
                    <Button
                      onClick={() => setShowCallForm(!showCallForm)}
                      variant="outline"
                      className="h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-shadow"
                    >
                      📞 Book a Call
                    </Button>
                  </motion.div>
                )}

                {/* Appointment Booking Section */}
                {quoteResult?.ghlContactId && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {appointmentConfirmed ? (
                      <Card className="shadow-2xl border-0 overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-white">
                          <div className="text-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', delay: 0.4 }}
                            >
                              <Check className="h-16 w-16 mx-auto mb-4" />
                            </motion.div>
                            <h2 className="text-3xl font-bold mb-2">Appointment Confirmed!</h2>
                            <p className="text-green-50 mb-4">
                              Your appointment has been scheduled
                            </p>
                          </div>
                        </div>
                        <CardContent className="pt-8 text-center pb-8">
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Appointment Date</p>
                              <p className="text-2xl font-bold text-gray-900">{appointmentDate}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Appointment Time</p>
                              <p className="text-2xl font-bold text-gray-900">{appointmentTime}</p>
                            </div>
                            <div className="pt-4 border-t">
                              <p className="text-sm text-gray-600">
                                A confirmation email has been sent. We look forward to seeing you!
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : showAppointmentForm ? (
                      <Card className="shadow-2xl border-0 overflow-hidden">
                        <div 
                          className="p-6 border-b"
                          style={{
                            background: `linear-gradient(to right, ${hexToRgba(primaryColor, 0.05)}, transparent)`
                          }}
                        >
                          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Calendar className="h-6 w-6" style={{ color: primaryColor }} />
                            Schedule Your Appointment
                          </h3>
                          <p className="text-gray-600 mt-2">Choose a date and time that works best for you</p>
                        </div>
                        <CardContent className="pt-8">
                          {bookingMessage && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`mb-6 p-4 rounded-lg ${
                                bookingMessage.type === 'success'
                                  ? 'bg-green-50 text-green-800 border border-green-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {bookingMessage.text}
                            </motion.div>
                          )}

                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-5"
                          >
                            <div>
                              <Label htmlFor="appt-date" className="text-base font-semibold block mb-2">
                                📅 Select Date
                              </Label>
                              <Input
                                id="appt-date"
                                type="date"
                                value={appointmentDate}
                                onChange={(e) => setAppointmentDate(e.target.value)}
                                className="h-12 text-base"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>

                            <div>
                              <Label htmlFor="appt-time" className="text-base font-semibold block mb-2">
                                🕐 Select Time
                              </Label>
                              <Input
                                id="appt-time"
                                type="time"
                                value={appointmentTime}
                                onChange={(e) => setAppointmentTime(e.target.value)}
                                className="h-12 text-base"
                              />
                            </div>

                            <div>
                              <Label htmlFor="appt-notes" className="text-base font-semibold block mb-2">
                                💬 Notes (Optional)
                              </Label>
                              <Input
                                id="appt-notes"
                                type="text"
                                placeholder="Any special requests or instructions..."
                                value={appointmentNotes}
                                onChange={(e) => setAppointmentNotes(e.target.value)}
                                className="h-12 text-base"
                              />
                            </div>

                            <div className="flex gap-3 pt-4">
                              <Button
                                onClick={handleBookAppointment}
                                disabled={isBookingAppointment || !appointmentDate || !appointmentTime}
                                className="flex-1 h-12 font-bold text-base"
                              >
                                {isBookingAppointment ? (
                                  <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Booking...
                                  </>
                                ) : (
                                  <>
                                    <Check className="mr-2 h-5 w-5" />
                                    Confirm Appointment
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowAppointmentForm(false);
                                  setBookingMessage(null);
                                }}
                                variant="outline"
                                className="h-12 font-bold text-base"
                              >
                                Cancel
                              </Button>
                            </div>
                          </motion.div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </motion.div>
                )}

                {/* Call Booking Section */}
                {quoteResult?.ghlContactId && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    {callConfirmed ? (
                      <Card className="shadow-2xl border-0 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-8 text-white">
                          <div className="text-center">
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', delay: 0.4 }}
                            >
                              <Check className="h-16 w-16 mx-auto mb-4" />
                            </motion.div>
                            <h2 className="text-3xl font-bold mb-2">Call Scheduled!</h2>
                            <p className="text-blue-50 mb-4">
                              Your consultation call has been scheduled
                            </p>
                          </div>
                        </div>
                        <CardContent className="pt-8 text-center pb-8">
                          <div className="space-y-4">
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Call Date</p>
                              <p className="text-2xl font-bold text-gray-900">{callDate}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 mb-1">Call Time</p>
                              <p className="text-2xl font-bold text-gray-900">{callTime}</p>
                            </div>
                            <div className="pt-4 border-t">
                              <p className="text-sm text-gray-600">
                                A confirmation has been sent. We'll call you at the scheduled time!
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : showCallForm ? (
                      <Card className="shadow-2xl border-0 overflow-hidden">
                        <div 
                          className="p-6 border-b"
                          style={{
                            background: `linear-gradient(to right, ${hexToRgba(primaryColor, 0.05)}, transparent)`
                          }}
                        >
                          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            📞 Schedule a Consultation Call
                          </h3>
                          <p className="text-gray-600 mt-2">Let's discuss your cleaning needs</p>
                        </div>
                        <CardContent className="pt-8">
                          {bookingMessage && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`mb-6 p-4 rounded-lg ${
                                bookingMessage.type === 'success'
                                  ? 'bg-green-50 text-green-800 border border-green-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {bookingMessage.text}
                            </motion.div>
                          )}

                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-5"
                          >
                            <div>
                              <Label htmlFor="call-date" className="text-base font-semibold block mb-2">
                                📅 Select Date
                              </Label>
                              <Input
                                id="call-date"
                                type="date"
                                value={callDate}
                                onChange={(e) => setCallDate(e.target.value)}
                                className="h-12 text-base"
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>

                            <div>
                              <Label htmlFor="call-time" className="text-base font-semibold block mb-2">
                                🕐 Select Time
                              </Label>
                              <Input
                                id="call-time"
                                type="time"
                                value={callTime}
                                onChange={(e) => setCallTime(e.target.value)}
                                className="h-12 text-base"
                              />
                            </div>

                            <div>
                              <Label htmlFor="call-notes" className="text-base font-semibold block mb-2">
                                💬 Notes (Optional)
                              </Label>
                              <Input
                                id="call-notes"
                                type="text"
                                placeholder="Any questions or topics to discuss..."
                                value={callNotes}
                                onChange={(e) => setCallNotes(e.target.value)}
                                className="h-12 text-base"
                              />
                            </div>

                            <div className="flex gap-3 pt-4">
                              <Button
                                onClick={handleBookCall}
                                disabled={isBookingCall || !callDate || !callTime}
                                className="flex-1 h-12 font-bold text-base"
                              >
                                {isBookingCall ? (
                                  <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Scheduling...
                                  </>
                                ) : (
                                  <>
                                    <Check className="mr-2 h-5 w-5" />
                                    Confirm Call
                                  </>
                                )}
                              </Button>
                              <Button
                                onClick={() => {
                                  setShowCallForm(false);
                                  setBookingMessage(null);
                                }}
                                variant="outline"
                                className="h-12 font-bold text-base"
                              >
                                Cancel
                              </Button>
                            </div>
                          </motion.div>
                        </CardContent>
                      </Card>
                    ) : null}
                  </motion.div>
                )}

                {/* Footer CTA */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center pt-4"
                >
                  <Button
                    onClick={() => {
                      setQuoteResult(null);
                      setCurrentStep(0);
                      setAppointmentConfirmed(false);
                      setCallConfirmed(false);
                      setShowAppointmentForm(false);
                      setShowCallForm(false);
                      setAppointmentDate('');
                      setAppointmentTime('');
                      setAppointmentNotes('');
                      setCallDate('');
                      setCallTime('');
                      setCallNotes('');
                    }}
                    variant="outline"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Get Another Quote
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
      </div>
    );
  }

  return (
    <div style={{ '--primary-color': primaryColor } as React.CSSProperties}>
      <style>{`
        :root {
          --primary-color: ${primaryColor};
        }
        .primary-bg { background-color: var(--primary-color); }
        .primary-text { color: var(--primary-color); }
        .primary-border { border-color: var(--primary-color); }
        .primary-gradient { background: linear-gradient(to right, var(--primary-color), ${hexToRgba(primaryColor, 0.7)}); }
      `}</style>
      <main className="min-h-screen bg-gradient-to-br via-white pt-12 pb-20 px-4 sm:px-6 lg:px-8"
            style={{ 
              backgroundImage: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.05)} 0%, transparent 50%, ${hexToRgba(primaryColor, 0.05)} 100%)`
            }}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 
            className="text-5xl font-bold bg-clip-text text-transparent mb-4"
            style={{
              backgroundImage: `linear-gradient(to right, ${primaryColor}, ${hexToRgba(primaryColor, 0.7)})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {widgetTitle}
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            {widgetSubtitle}
          </p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <Progress 
            value={progress} 
            className="h-3 shadow-lg" 
            style={{
              ['--primary' as any]: hexToHsl(primaryColor)
            }}
          />
        </motion.div>

        {/* Question Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            <Card 
              className="shadow-2xl border-2 bg-white/90 backdrop-blur-sm"
              style={{ borderColor: `${primaryColor}33` }}
            >
              <CardContent className="pt-8 pb-8 px-8">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Label htmlFor={currentQuestion.id} className="text-2xl font-semibold text-gray-900 block mb-4">
                      {currentQuestion.label}
                      {currentQuestion.required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
                    </Label>

                    {currentQuestion.type === 'text' && (
                      <Input
                        id={currentQuestion.id}
                        type="text"
                        placeholder={currentQuestion.placeholder}
                        className="h-14 text-lg"
                        {...register(currentQuestion.id as any)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            nextStep();
                          }
                        }}
                      />
                    )}

                    {currentQuestion.type === 'address' && (
                      <GooglePlacesAutocomplete
                        id={currentQuestion.id}
                        label={currentQuestion.label}
                        placeholder={currentQuestion.placeholder}
                        required={currentQuestion.required}
                        primaryColor={primaryColor}
                        value={getValues(getFormFieldName(currentQuestion.id) as any)}
                        onChange={(value, placeDetails) => {
                          // Update form value using sanitized field name
                          const fieldName = getFormFieldName(currentQuestion.id);
                          (register(fieldName as any) as any).onChange({ target: { value } });
                          // Store coordinates for service area check
                          if (placeDetails) {
                            setAddressCoordinates({
                              lat: placeDetails.lat,
                              lng: placeDetails.lng,
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            nextStep();
                          }
                        }}
                      />
                    )}

                    {currentQuestion.type === 'email' && (
                      <Input
                        id={currentQuestion.id}
                        type="email"
                        placeholder={currentQuestion.placeholder}
                        className="h-14 text-lg"
                        {...register(getFormFieldName(currentQuestion.id) as any)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            nextStep();
                          }
                        }}
                      />
                    )}

                    {currentQuestion.type === 'tel' && (
                      <Input
                        id={currentQuestion.id}
                        type="tel"
                        placeholder={currentQuestion.placeholder}
                        className="h-14 text-lg"
                        {...register(getFormFieldName(currentQuestion.id) as any)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            nextStep();
                          }
                        }}
                      />
                    )}

                    {currentQuestion.type === 'number' && currentQuestion.id !== 'squareFeet' && (
                      <Input
                        id={currentQuestion.id}
                        type="number"
                        step="1"
                        placeholder={currentQuestion.placeholder}
                        className="h-14 text-lg"
                        {...register(getFormFieldName(currentQuestion.id) as any, { valueAsNumber: true })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            nextStep();
                          }
                        }}
                      />
                    )}

                    {(currentQuestion.type === 'select' || currentQuestion.id === 'squareFeet') && (
                      <Controller
                        name={getFormFieldName(currentQuestion.id) as any}
                        control={control}
                        render={({ field }) => (
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              // Move to next step with a small delay to ensure state is updated
                              // Don't validate here - just move forward, nextStep will validate
                              setTimeout(() => {
                                nextStep();
                              }, 100);
                            }} 
                            value={field.value || ''}
                          >
                            <SelectTrigger 
                              className="h-14 text-lg"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && field.value) {
                                  e.preventDefault();
                                  nextStep();
                                }
                              }}
                            >
                              <SelectValue placeholder="Select an option" />
                            </SelectTrigger>
                            <SelectContent>
                              {(currentQuestion.id === 'squareFeet' && (!currentQuestion.options || currentQuestion.options.length === 0)) ? (
                                <>
                                  <SelectItem value="500-1000">Under 1,000 sq ft</SelectItem>
                                  <SelectItem value="1000-1500">1,000 - 1,500 sq ft</SelectItem>
                                  <SelectItem value="1500-2000">1,500 - 2,000 sq ft</SelectItem>
                                  <SelectItem value="2000-2500">2,000 - 2,500 sq ft</SelectItem>
                                  <SelectItem value="2500-3000">2,500 - 3,000 sq ft</SelectItem>
                                  <SelectItem value="3000-3500">3,000 - 3,500 sq ft</SelectItem>
                                  <SelectItem value="3500-4000">3,500 - 4,000 sq ft</SelectItem>
                                  <SelectItem value="4000-4500">4,000 - 4,500 sq ft</SelectItem>
                                  <SelectItem value="4500+">Over 4,500 sq ft</SelectItem>
                                </>
                              ) : (
                                currentQuestion.options?.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}

                    {errors[getFormFieldName(currentQuestion.id) as any] && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-500 mt-2"
                      >
                        {(errors[getFormFieldName(currentQuestion.id) as any] as any)?.message}
                      </motion.p>
                    )}
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-between items-center mt-8 gap-4"
        >
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
            size="lg"
            className="flex items-center gap-2 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </Button>

          <Button
            onClick={nextStep}
            disabled={isLoading}
            size="lg"
            className="flex items-center gap-2 min-w-[140px]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Calculating...
              </>
            ) : currentStep === questions.length - 1 ? (
              <>
                Get Quote
                <Sparkles className="h-5 w-5" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </motion.div>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-8">
          {questions.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setDirection(index > currentStep ? 1 : -1);
                setCurrentStep(index);
              }}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8'
                  : index < currentStep
                  ? 'w-2'
                  : 'w-2 bg-gray-300'
              }`}
              style={{
                backgroundColor: index === currentStep 
                  ? primaryColor 
                  : index < currentStep 
                  ? `${primaryColor}80` 
                  : undefined
              }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </div>
      </div>
    </main>
    </div>
  );
}
