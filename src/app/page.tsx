'use client';

import React from 'react';
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
import { Copy, ChevronLeft, ChevronRight, Sparkles, Calendar, Clock, Loader2, Check, AlertCircle } from 'lucide-react';
import { SurveyQuestion } from '@/lib/survey/schema';
import { GooglePlacesAutocomplete, PlaceDetails } from '@/components/GooglePlacesAutocomplete';
import { CalendarBooking } from '@/components/CalendarBooking';

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
  
  const cleaned = rangeString.trim();
  
  // Handle "Less Than 1500" or "Less Than1500" format
  if (cleaned.toLowerCase().includes('less than')) {
    const match = cleaned.match(/\d+/);
    if (match) {
      const max = parseInt(match[0], 10);
      return max - 1; // Use upper bound - 1 for matching
    }
    return 1499; // Default for "Less Than 1500"
  }
  
  // Handle ranges like '1501-2000', '2001-2500', etc.
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    const min = parseInt(parts[0], 10) || 0;
    const max = parseInt(parts[1], 10) || min;
    // Use upper bound - 1 to ensure we stay within this range tier
    return max - 1;
  }
  
  // Try to parse as direct number
  const num = parseInt(cleaned, 10);
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
 * Parse option label to separate main text from details/explanations
 * Supports multiple formats: parentheses, dashes, colons, etc.
 * Returns an object with mainText and detailsText
 */
function parseOptionLabel(label: string): { mainText: string; detailsText: string | null } {
  // Try different patterns to extract details
  // Pattern 1: Text in parentheses at the end: "Main Text (Details)"
  let match = label.match(/^(.+?)\s*\((.+?)\)\s*$/);
  if (match) {
    return {
      mainText: match[1].trim(),
      detailsText: match[2].trim(),
    };
  }
  
  // Pattern 2: Text with dash separator: "Main Text - Details"
  match = label.match(/^(.+?)\s*-\s*(.+)$/);
  if (match) {
    return {
      mainText: match[1].trim(),
      detailsText: match[2].trim(),
    };
  }
  
  // Pattern 3: Text with colon separator: "Main Text: Details"
  match = label.match(/^(.+?):\s*(.+)$/);
  if (match) {
    return {
      mainText: match[1].trim(),
      detailsText: match[2].trim(),
    };
  }
  
  // No details found, return the whole label as main text
  return {
    mainText: label,
    detailsText: null,
  };
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
      if (question.required) {
        // For required number fields, reject undefined/null/empty
        // Also reject 0 if it's not a valid option for this question (e.g., people question starts at 1)
        const questionId = question.id.toLowerCase();
        const allowsZero = questionId.includes('bath') || questionId.includes('pets') || questionId.includes('shedding');
        
        schemaShape[fieldId] = z.union([
          z.number()
            .int({ message: `${question.label} must be a whole number` })
            .min(allowsZero ? 0 : 1, `${question.label} must be ${allowsZero ? '0' : '1'} or greater`),
          z.undefined(),
          z.null(),
          z.literal(''),
        ]).refine((val) => {
          // Reject undefined, null, and empty string
          if (val === undefined || val === null || val === '') {
            return false;
          }
          
          // If it's a number, ensure it's valid
          if (typeof val === 'number') {
            // Reject 0 if this question doesn't allow it (e.g., people question)
            if (val === 0 && !allowsZero) {
              return false;
            }
            return !isNaN(val);
          }
          
          return false;
        }, {
          message: `${question.label} is required`
        });
      } else {
        schemaShape[fieldId] = z.number().int().min(0).optional();
      }
    } else if (question.type === 'email') {
      schemaShape[fieldId] = question.required
        ? z.string().min(1, `${question.label} is required`).email('Valid email is required')
        : z.string().email().optional();
    } else if (question.type === 'tel') {
      schemaShape[fieldId] = question.required
        ? z.string().min(7, 'Valid phone number is required')
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
// No hardcoded defaults - all questions come from KV via the unified API

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('bi-weekly'); // Track selected frequency
  const [selectedServiceType, setSelectedServiceType] = useState<string>(''); // Track selected service type
  const [houseDetails, setHouseDetails] = useState<{
    squareFeet: string;
    bedrooms: number;
    fullBaths: number;
    halfBaths: number;
  } | null>(null);
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
  // Availability checking state
  const [appointmentAvailability, setAppointmentAvailability] = useState<{ available: boolean; message: string; checking: boolean; fallback?: boolean; warning?: string } | null>(null);
  const [callAvailability, setCallAvailability] = useState<{ available: boolean; message: string; checking: boolean; fallback?: boolean; warning?: string } | null>(null);
  const [widgetTitle, setWidgetTitle] = useState('Raleigh Cleaning Company');
  const [widgetSubtitle, setWidgetSubtitle] = useState("Let's get your professional cleaning price!");
  const [primaryColor, setPrimaryColor] = useState('#f61590');
  // Start with empty array, will be filled from unified API
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [quoteSchema, setQuoteSchema] = useState<z.ZodObject<any>>(generateSchemaFromQuestions([]));
  const [addressCoordinates, setAddressCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [serviceAreaChecked, setServiceAreaChecked] = useState(false);
  const [formSettings, setFormSettings] = useState<any>({});
  const appointmentFormRef = useRef<HTMLDivElement>(null);
  const callFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    loadWidgetSettings();
    loadSurveyQuestions();
    loadFormSettings();
  }, []);

  // Auto-scroll when appointment form opens
  useEffect(() => {
    if (showAppointmentForm && appointmentFormRef.current) {
      setTimeout(() => {
        appointmentFormRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        window.scrollBy({ top: -20, behavior: 'smooth' });
      }, 200);
    }
  }, [showAppointmentForm]);

  // Auto-scroll when call form opens
  useEffect(() => {
    if (showCallForm && callFormRef.current) {
      setTimeout(() => {
        callFormRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        window.scrollBy({ top: -20, behavior: 'smooth' });
      }, 200);
    }
  }, [showCallForm]);

  // Update document title when widgetTitle changes
  useEffect(() => {
    if (widgetTitle) {
      document.title = widgetTitle;
    }
  }, [widgetTitle]);

  /**
   * Load survey questions from unified API
   * No hardcoded defaults, no band-aid fixes, just fetch and use
   */
  const loadSurveyQuestions = async () => {
    try {
      const response = await fetch('/api/surveys/questions', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load survey: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.questions || !Array.isArray(data.questions)) {
        throw new Error('Invalid survey questions format');
      }
      
      // Trust the data - it's already validated by the API
      const sortedQuestions = [...data.questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      
      setQuestions(sortedQuestions);
      setQuoteSchema(generateSchemaFromQuestions(sortedQuestions));
    } catch (error) {
      console.error('Failed to load survey questions:', error);
      alert('Error loading form. Please refresh the page.');
    }
  };

  // Auto-focus input when step changes
  useEffect(() => {
    if (mounted && currentQuestion) {
      // Small delay to ensure the animation has started and input is rendered
      const timer = setTimeout(() => {
        // Only focus text inputs (name, email, phone, address) for keyboard users
        // For number/select questions, we use bubble buttons - no need to focus
        if (currentQuestion.type === 'text' || currentQuestion.type === 'email' || currentQuestion.type === 'tel' || currentQuestion.type === 'address') {
          const inputElement = document.getElementById(currentQuestion.id) as HTMLInputElement;
          if (inputElement) {
            inputElement.focus();
            // Also select the text if there's a value, so user can easily replace it
            if (inputElement.value) {
              inputElement.select();
            }
          }
        }
        // For number/select questions with bubble buttons, we don't focus - users just click bubbles
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
  // Never preselect values - all fields start empty/undefined so users must make a choice
  const getDefaultValues = () => {
    const defaults: Record<string, any> = {};
    questions.forEach((q) => {
      const fieldName = getFormFieldName(q.id);
      // Always start with undefined/empty - never preselect
      if (q.type === 'number') {
        defaults[fieldName] = undefined; // Changed from 0 to undefined
      } else {
        defaults[fieldName] = '';
      }
    });

    // Apply query parameters from either custom config or standard camelCase params
    if (typeof window !== 'undefined' && mounted) {
      const params = new URLSearchParams(window.location.search);

      // First try custom mapping from admin config
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

      // Also support standard camelCase query parameters (from widget embed)
      // These will override custom config if both are present
      const standardParams: Record<string, string> = {
        firstName: 'firstName',
        lastName: 'lastName',
        email: 'email',
        phone: 'phone',
        address: 'address',
        city: 'city',
        state: 'state',
        postalCode: 'postalCode',
      };

      Object.entries(standardParams).forEach(([fieldId, paramName]) => {
        const value = params.get(paramName);
        if (value && value.trim()) {
          defaults[fieldId] = value;
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
    watch,
    setValue,
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
    const currentValue = getValues(fieldName as any);
    
    // For required questions, explicitly check if value is empty/undefined before validation
    if (currentQuestion.required) {
      // Check for empty values based on field type
      let isEmpty = false;
      if (currentQuestion.type === 'number') {
        // For number fields, undefined, null, or 0 (if not allowed) means empty
        const questionId = currentQuestion.id.toLowerCase();
        const allowsZero = questionId.includes('bath') || questionId.includes('pets') || questionId.includes('shedding');
        isEmpty = currentValue === undefined || currentValue === null || currentValue === '' || (currentValue === 0 && !allowsZero);
      } else {
        // For other fields, empty string, undefined, or null means empty
        isEmpty = !currentValue || currentValue === '' || currentValue === undefined || currentValue === null;
      }
      
      if (isEmpty) {
        // Trigger validation to show error message
        await trigger(fieldName as any);
        const fieldError = (errors as any)[fieldName]?.message;
        console.warn('Validation failed - empty value for required field:', fieldName, 'Current value:', currentValue);
        
        // Scroll to the error message to make it more visible
        setTimeout(() => {
          const errorElement = document.querySelector(`[data-field-error="${fieldName}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 100);
        
        return;
      }
    }
    
    // Run full validation
    const isValid = await trigger(fieldName as any);
    
    if (!isValid) {
      const fieldError = (errors as any)[fieldName]?.message;
      console.warn('Validation failed for:', fieldName, '(original ID:', currentQuestion.id + ')', 'Current value:', currentValue);
      console.warn('Field error:', fieldError);
      
      // Scroll to the error message to make it more visible
      setTimeout(() => {
        const errorElement = document.querySelector(`[data-field-error="${fieldName}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
      
      return;
    }
    
    if (isValid) {
      // Check if this is an address question - if so, check service area
      if (currentQuestion.type === 'address' && addressCoordinates && !serviceAreaChecked) {
        // Validate coordinates are not 0,0 (invalid/unknown location)
        if (addressCoordinates.lat === 0 && addressCoordinates.lng === 0) {
          console.warn('Invalid coordinates (0,0) - skipping service area check. Address may need to be geocoded.');
          setServiceAreaChecked(true);
          setDirection(1);
          if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
          }
          return;
        }

        setIsLoading(true);
        try {
          console.log('Checking service area with coordinates:', addressCoordinates);
          const response = await fetch('/api/service-area/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: addressCoordinates.lat,
              lng: addressCoordinates.lng,
            }),
          });

          const result = await response.json();
          console.log('Service area check result:', result);

          if (!result.inServiceArea) {
            // Out of service area - create contact and redirect
            const data = getValues();
            const addressFieldName = getFormFieldName(currentQuestion.id);
            // Get address from sanitized field name (handles fields with dots)
            const addressValue = data[addressFieldName] || data.address || '';
            try {
              await fetch('/api/service-area/out-of-service', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  firstName: data.firstName || '',
                  lastName: data.lastName || '',
                  email: data.email || '',
                  phone: data.phone || '',
                  address: addressValue,
                }),
              });
            } catch (error) {
              console.error('Error creating out-of-service contact:', error);
            }

            // Redirect to out-of-service page
            const params = new URLSearchParams({
              data: JSON.stringify({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '',
                address: addressValue,
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
    setHouseDetails(null);
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
      // Store the selected service type and frequency for display
      // Always set serviceType - it's required in the form
      setSelectedServiceType(formData.serviceType || '');
      
      // Set frequency - if it's one-time or if service type is a one-time service, set to one-time
      const serviceType = formData.serviceType || '';
      const isOneTimeServiceType = ['move-in', 'move-out', 'initial', 'deep', 'general'].includes(serviceType);
      
      if (formData.frequency === 'one-time' || isOneTimeServiceType) {
        setSelectedFrequency('one-time');
      } else if (formData.frequency) {
        setSelectedFrequency(formData.frequency);
      } else {
        // Default to bi-weekly only if no frequency specified and not a one-time service
        setSelectedFrequency('bi-weekly');
      }
      
      console.log('Quote result - Service Type:', formData.serviceType, 'Frequency:', formData.frequency, 'Is One-Time Service:', isOneTimeServiceType);
      // Store house details for display
      setHouseDetails({
        squareFeet: formData.squareFeet || '',
        bedrooms: Number(formData.bedrooms) || 0,
        fullBaths: Number(formData.fullBaths) || 0,
        halfBaths: convertSelectToNumber(formData.halfBaths) || 0,
      });
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

  const handleBookAppointment = async (date?: string, time?: string, notes?: string) => {
    const finalDate = date || appointmentDate;
    const finalTime = time || appointmentTime;
    const finalNotes = notes || appointmentNotes;

    if (!finalDate || !finalTime) {
      setBookingMessage({ type: 'error', text: 'Please select a date and time' });
      return;
    }

    // If no GHL contact ID, this is an error - contact should have been created with quote
    if (!quoteResult?.ghlContactId) {
      console.error('No contactId available for booking - contact creation may have failed');
      setBookingMessage({
        type: 'error',
        text: 'Unable to book appointment. Please try again.',
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
          date: finalDate,
          time: finalTime,
          notes: finalNotes || 'Appointment booked through quote form',
          type: 'appointment',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBookingMessage({ type: 'success', text: 'Appointment booked successfully!' });
        setAppointmentConfirmed(true);
        setShowAppointmentForm(false);
        setTimeout(() => {
          setAppointmentDate(finalDate);
          setAppointmentTime(finalTime);
          setAppointmentNotes(finalNotes);
        }, 1000);
      } else {
        // Use user-friendly message if available, otherwise use error message
        const errorMessage = data.userMessage || data.error || data.details || 'Failed to book appointment';
        console.error('Appointment booking failed:', {
          status: response.status,
          error: data.error,
          details: data.details,
          userMessage: data.userMessage,
        });
        setBookingMessage({
          type: 'error',
          text: errorMessage,
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

  // Check appointment availability
  const checkAppointmentAvailability = async (date: string, time: string) => {
    if (!date || !time) {
      setAppointmentAvailability(null);
      return;
    }

    setAppointmentAvailability({ available: false, message: 'Checking availability...', checking: true });

    try {
      const response = await fetch(
        `/api/calendar-availability?type=appointment&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`
      );

      if (response.ok) {
        const data = await response.json();
        setAppointmentAvailability({
          available: data.available,
          message: data.message || (data.available ? 'Time slot is available' : 'Time slot is not available'),
          checking: false,
          fallback: data.fallback || false,
          warning: data.warning,
        });
      } else {
        const error = await response.json();
        setAppointmentAvailability({
          available: false,
          message: error.error || 'Unable to check availability',
          checking: false,
        });
      }
    } catch (error) {
      console.error('Error checking appointment availability:', error);
      setAppointmentAvailability({
        available: false,
        message: 'Failed to check availability',
        checking: false,
      });
    }
  };

  // Check call availability
  const checkCallAvailability = async (date: string, time: string) => {
    if (!date || !time) {
      setCallAvailability(null);
      return;
    }

    setCallAvailability({ available: false, message: 'Checking availability...', checking: true });

    try {
      const response = await fetch(
        `/api/calendar-availability?type=call&date=${encodeURIComponent(date)}&time=${encodeURIComponent(time)}`
      );

      if (response.ok) {
        const data = await response.json();
        setCallAvailability({
          available: data.available,
          message: data.message || (data.available ? 'Time slot is available' : 'Time slot is not available'),
          checking: false,
          fallback: data.fallback || false,
          warning: data.warning,
        });
      } else {
        const error = await response.json();
        setCallAvailability({
          available: false,
          message: error.error || 'Unable to check availability',
          checking: false,
        });
      }
    } catch (error) {
      console.error('Error checking call availability:', error);
      setCallAvailability({
        available: false,
        message: 'Failed to check availability',
        checking: false,
      });
    }
  };

  const handleBookCall = async (date?: string, time?: string, notes?: string) => {
    const finalDate = date || callDate;
    const finalTime = time || callTime;
    const finalNotes = notes || callNotes;

    if (!finalDate || !finalTime) {
      setBookingMessage({ type: 'error', text: 'Please select a date and time' });
      return;
    }

    // If no GHL contact ID, this is an error - contact should have been created with quote
    if (!quoteResult?.ghlContactId) {
      console.error('No contactId available for booking - contact creation may have failed');
      setBookingMessage({
        type: 'error',
        text: 'Unable to book appointment. Please try again.',
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
          date: finalDate,
          time: finalTime,
          notes: finalNotes || 'Call scheduled through quote form',
          type: 'call',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setBookingMessage({ type: 'success', text: 'Call scheduled successfully!' });
        setCallConfirmed(true);
        setShowCallForm(false);
        setTimeout(() => {
          setCallDate(finalDate);
          setCallTime(finalTime);
          setCallNotes(finalNotes);
        }, 1000);
      } else {
        // Use user-friendly message if available, otherwise use error message
        const errorMessage = data.userMessage || data.error || data.details || 'Failed to schedule call';
        console.error('Call booking failed:', {
          status: response.status,
          error: data.error,
          details: data.details,
          userMessage: data.userMessage,
        });
        setBookingMessage({
          type: 'error',
          text: errorMessage,
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
  
  // Show loading state while questions are being fetched
  if (questions.length === 0 && mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  if (quoteResult) {
    const primaryHsl = hexToHsl(primaryColor);
    return (
      <div>
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
                    <Button onClick={() => {
                      setQuoteResult(null);
                      setHouseDetails(null);
                    }}>Go Back and Edit</Button>
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

                {/* Beautiful Quote Card - DAZZLED UP */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="shadow-2xl border-0 overflow-hidden relative">
                    {/* Animated background gradient */}
                    <div 
                      className="p-8 text-white relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${primaryColor}, ${hexToRgba(primaryColor, 0.7)})`
                      }}
                    >
                      {/* Decorative animated elements */}
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        className="absolute top-2 right-4 opacity-20"
                      >
                        <Sparkles className="h-12 w-12" />
                      </motion.div>
                      
                      <div className="flex items-center justify-between mb-2 relative z-10">
                        <div>
                          <p className="text-white/80 text-sm font-semibold tracking-widest mb-1">✨ YOUR QUOTE ✨</p>
                          <h3 className="text-3xl md:text-4xl font-black">Your Perfect Quote</h3>
                        </div>
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Sparkles className="h-10 w-10 opacity-90" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Quote Content with enhanced styling */}
                    <CardContent className="pt-10 pb-10 bg-gradient-to-b from-gray-50 to-white">
                      {/* Custom service options display */}
                      <div className="space-y-6">
                        {/* House Details */}
                        {houseDetails && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 }}
                            className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 pl-6 py-4 rounded-r-xl shadow-sm"
                          >
                            <h4 className="font-bold text-lg text-gray-900 mb-3">House Details</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-700">
                              <div>
                                <span className="font-semibold">SqFt:</span>{' '}
                                <span className="text-gray-900">{houseDetails.squareFeet}</span>
                              </div>
                              <div>
                                <span className="font-semibold">Rooms:</span>{' '}
                                <span className="text-gray-900">{houseDetails.bedrooms}</span>
                              </div>
                              <div>
                                <span className="font-semibold">Full Baths:</span>{' '}
                                <span className="text-gray-900">{houseDetails.fullBaths}</span>
                              </div>
                              <div>
                                <span className="font-semibold">Half Baths:</span>{' '}
                                <span className="text-gray-900">{houseDetails.halfBaths}</span>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {/* Display quote based on user selection */}
                        {quoteResult.ranges && (() => {
                          // Helper function to get frequency display info
                          const getFrequencyInfo = (freq: string) => {
                            if (freq === 'weekly') {
                              return { name: 'Weekly Cleaning', range: quoteResult.ranges!.weekly, icon: '📅' };
                            } else if (freq === 'bi-weekly') {
                              return { name: 'Bi-Weekly Cleaning', range: quoteResult.ranges!.biWeekly, icon: '📅' };
                            } else if (freq === 'monthly' || freq === 'four-week') {
                              return { name: 'Monthly Cleaning (Every 4 Weeks)', range: quoteResult.ranges!.fourWeek, icon: '📅' };
                            }
                            return null;
                          };
                          
                          // Get service type info for one-time services
                          // Check if service type indicates one-time (move-in, move-out, initial, deep, general)
                          const isOneTimeService = (serviceType: string) => {
                            return ['move-in', 'move-out', 'initial', 'deep', 'general'].includes(serviceType);
                          };
                          
                          const getServiceTypeInfo = (serviceType: string, freq: string) => {
                            // If frequency is one-time OR service type is a one-time service type, treat as one-time
                            if (freq === 'one-time' || isOneTimeService(serviceType)) {
                              if (serviceType === 'move-in') {
                                return { name: 'Move-In Clean', range: quoteResult.ranges!.moveInOutBasic, icon: '🚚' };
                              } else if (serviceType === 'move-out') {
                                return { name: 'Move-Out Clean', range: quoteResult.ranges!.moveInOutFull, icon: '🚚' };
                              } else if (serviceType === 'initial') {
                                return { name: 'Initial Cleaning', range: quoteResult.ranges!.initial, icon: '✨' };
                              } else if (serviceType === 'deep') {
                                return { name: 'Deep Clean', range: quoteResult.ranges!.deep, icon: '🧹' };
                              } else if (serviceType === 'general') {
                                return { name: 'General Clean', range: quoteResult.ranges!.general, icon: '✨' };
                              }
                            }
                            return null;
                          };

                          const selectedFreqInfo = getFrequencyInfo(selectedFrequency);
                          const selectedServiceInfo = getServiceTypeInfo(selectedServiceType, selectedFrequency);
                          
                          // Determine if this is a one-time service
                          const isOneTime = isOneTimeService(selectedServiceType) || selectedFrequency === 'one-time';
                          const showSelectedRecurring = selectedFreqInfo && !isOneTime && selectedFrequency !== 'one-time';
                          const showSelectedOneTime = selectedServiceInfo && isOneTime;

                          return (
                            <>
                              {/* Show selected service FIRST and prominently */}
                              {showSelectedOneTime && selectedServiceInfo && (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.15 }}
                                  className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-l-4 border-green-600 pl-6 py-5 rounded-r-xl shadow-lg mb-4"
                                >
                                  <div className="flex items-center gap-3">
                                    <motion.div
                                      animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                      className="text-3xl"
                                    >
                                      🎯
                                    </motion.div>
                                    <div>
                                      <div className="text-sm font-semibold text-green-700 mb-1">YOUR SELECTED SERVICE</div>
                                      <span className="font-black text-2xl md:text-3xl bg-gradient-to-r from-green-700 via-emerald-600 to-green-700 bg-clip-text text-transparent tracking-wide">
                                        {selectedServiceInfo.icon} {selectedServiceInfo.name}: ${selectedServiceInfo.range.low} to ${selectedServiceInfo.range.high}
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                              
                              {showSelectedRecurring && selectedFreqInfo && (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.15 }}
                                  className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border-l-4 border-green-600 pl-6 py-5 rounded-r-xl shadow-lg mb-4"
                                >
                                  <div className="flex items-center gap-3">
                                    <motion.div
                                      animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                                      transition={{ duration: 2, repeat: Infinity }}
                                      className="text-3xl"
                                    >
                                      🎯
                                    </motion.div>
                                    <div>
                                      <div className="text-sm font-semibold text-green-700 mb-1">YOUR SELECTED SERVICE</div>
                                      <span className="font-black text-2xl md:text-3xl bg-gradient-to-r from-green-700 via-emerald-600 to-green-700 bg-clip-text text-transparent tracking-wide">
                                        {selectedFreqInfo.icon} {selectedFreqInfo.name}: ${selectedFreqInfo.range.low} to ${selectedFreqInfo.range.high}
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              )}

                              {/* Show other options only if they're not the selected service */}
                              {!showSelectedOneTime && (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.2 }}
                                  className="space-y-3 mb-4"
                                >
                                  {/* Deep Clean - only show if not selected */}
                                  {selectedServiceType !== 'deep' && (
                                    <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-l-4 border-blue-600 pl-6 py-4 rounded-r-xl shadow-md">
                                      <div className="flex items-center gap-3">
                                        <span className="text-2xl">🧹</span>
                                        <span className="font-black text-xl md:text-2xl bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 bg-clip-text text-transparent tracking-wide">
                                          Deep Clean: ${quoteResult.ranges.deep.low} to ${quoteResult.ranges.deep.high}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {/* General Clean - only show if not selected */}
                                  {selectedServiceType !== 'general' && (
                                    <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 border-l-4 border-blue-600 pl-6 py-4 rounded-r-xl shadow-md">
                                      <div className="flex items-center gap-3">
                                        <span className="text-2xl">✨</span>
                                        <span className="font-black text-xl md:text-2xl bg-gradient-to-r from-blue-700 via-cyan-600 to-blue-700 bg-clip-text text-transparent tracking-wide">
                                          General Clean: ${quoteResult.ranges.general.low} to ${quoteResult.ranges.general.high}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}

                              {/* Show other recurring options if a recurring service was selected */}
                              {showSelectedRecurring && (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.25 }}
                                  className="space-y-2"
                                >
                                  <div className="text-sm font-semibold text-gray-600 mb-2">OTHER RECURRING OPTIONS:</div>
                                  {selectedFrequency !== 'weekly' && (
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 pl-6 py-3 rounded-r-xl shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">📅</span>
                                        <span className="font-bold text-lg text-gray-700">
                                          Weekly Cleaning: ${quoteResult.ranges.weekly.low} to ${quoteResult.ranges.weekly.high}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {selectedFrequency !== 'bi-weekly' && (
                                    <div className="bg-gradient-to-r from-yellow-100 via-amber-100 to-yellow-100 border-l-4 border-yellow-500 pl-6 py-3 rounded-r-xl shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">⭐</span>
                                        <span className="font-bold text-lg text-yellow-800">
                                          Bi-Weekly Cleaning: ${quoteResult.ranges.biWeekly.low} to ${quoteResult.ranges.biWeekly.high} (Most Popular)
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {selectedFrequency !== 'monthly' && (
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 pl-6 py-3 rounded-r-xl shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">📅</span>
                                        <span className="font-bold text-lg text-gray-700">
                                          Monthly Cleaning (Every 4 Weeks): ${quoteResult.ranges.fourWeek.low} to ${quoteResult.ranges.fourWeek.high}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}

                              {/* Show one-time service options if a one-time service was selected */}
                              {showSelectedOneTime && (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.25 }}
                                  className="space-y-2 mt-4"
                                >
                                  <div className="text-sm font-semibold text-gray-600 mb-2">OTHER ONE-TIME OPTIONS:</div>
                                  {selectedServiceType !== 'deep' && (
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 pl-6 py-3 rounded-r-xl shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">🧹</span>
                                        <span className="font-bold text-lg text-gray-700">
                                          Deep Clean: ${quoteResult.ranges.deep.low} to ${quoteResult.ranges.deep.high}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {selectedServiceType !== 'general' && (
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 pl-6 py-3 rounded-r-xl shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">✨</span>
                                        <span className="font-bold text-lg text-gray-700">
                                          General Clean: ${quoteResult.ranges.general.low} to ${quoteResult.ranges.general.high}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {selectedServiceType !== 'move-in' && (
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 pl-6 py-3 rounded-r-xl shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">🚚</span>
                                        <span className="font-bold text-lg text-gray-700">
                                          Move-In Clean: ${quoteResult.ranges.moveInOutBasic.low} to ${quoteResult.ranges.moveInOutBasic.high}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  {selectedServiceType !== 'move-out' && (
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 pl-6 py-3 rounded-r-xl shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl">🚚</span>
                                        <span className="font-bold text-lg text-gray-700">
                                          Move-Out Clean: ${quoteResult.ranges.moveInOutFull.low} to ${quoteResult.ranges.moveInOutFull.high}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </>
                          );
                        })()}
                          </>
                        )}

                        {/* Initial Cleaning Note if applicable */}
                        {quoteResult.initialCleaningRequired && (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-gray-600 text-sm pt-2"
                          >
                            <p className="font-semibold">📌 Note: An initial cleaning is required as your first service.</p>
                            <p>This gets your home to our maintenance standards.</p>
                          </motion.div>
                        )}
                      </div>

                      {/* Decorative footer */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="mt-8 pt-6 border-t border-gray-200 text-center"
                      >
                        <p className="text-gray-500 text-sm">
                          <span className="inline-block mr-2">🎯</span>
                          Professional pricing • Customized for your needs
                        </p>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Two CTAs - Book Appointment and Book a Call - SUPER PROMINENT */}
                {quoteResult && !appointmentConfirmed && !callConfirmed && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
                  >
                    {/* Book Appointment CTA */}
                    <motion.div
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      animate={{ 
                        boxShadow: [
                          `0 20px 40px -12px ${hexToRgba(primaryColor, 0.4)}`,
                          `0 25px 50px -12px ${hexToRgba(primaryColor, 0.5)}`,
                          `0 20px 40px -12px ${hexToRgba(primaryColor, 0.4)}`
                        ]
                      }}
                      transition={{ 
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                    >
                      <Button
                        onClick={() => {
                          const willShow = !showAppointmentForm;
                          setShowAppointmentForm(willShow);
                          // Close call form if opening appointment form
                          if (willShow) {
                            setShowCallForm(false);
                          }
                          // Scroll to appointment form after a brief delay to allow it to render
                          if (willShow) {
                            setTimeout(() => {
                              appointmentFormRef.current?.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                              });
                              // Add a small offset for better visibility
                              window.scrollBy({ top: -20, behavior: 'smooth' });
                            }, 150);
                          }
                        }}
                        className="w-full h-24 md:h-28 text-xl md:text-2xl font-black shadow-2xl hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.4)] transition-all duration-300 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-600 hover:from-blue-700 hover:via-blue-800 hover:to-cyan-700 relative overflow-hidden group border-4 border-white/30"
                        style={{
                          boxShadow: `0 20px 40px -12px ${hexToRgba(primaryColor, 0.4)}, 0 0 0 1px rgba(255,255,255,0.1) inset`,
                        }}
                      >
                        {/* Animated gradient overlay */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          animate={{ x: [-200, 200] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                        {/* Pulsing glow effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-br from-blue-400/50 to-cyan-400/50"
                          animate={{ opacity: [0.5, 0.8, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <span className="relative z-10 flex items-center justify-center gap-3 text-white drop-shadow-lg">
                          <motion.span
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="text-3xl"
                          >
                            📅
                          </motion.span>
                          <span className="tracking-wide">Book an Appointment</span>
                        </span>
                      </Button>
                    </motion.div>

                    {/* Book a Call CTA */}
                    <motion.div
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      animate={{ 
                        boxShadow: [
                          `0 20px 40px -12px ${hexToRgba(primaryColor, 0.3)}`,
                          `0 25px 50px -12px ${hexToRgba(primaryColor, 0.4)}`,
                          `0 20px 40px -12px ${hexToRgba(primaryColor, 0.3)}`
                        ]
                      }}
                      transition={{ 
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                    >
                      <Button
                        onClick={() => {
                          const willShow = !showCallForm;
                          setShowCallForm(willShow);
                          // Close appointment form if opening call form
                          if (willShow) {
                            setShowAppointmentForm(false);
                          }
                          // Scroll to call form after a brief delay to allow it to render
                          if (willShow) {
                            setTimeout(() => {
                              callFormRef.current?.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'start',
                                inline: 'nearest'
                              });
                              // Add a small offset for better visibility
                              window.scrollBy({ top: -20, behavior: 'smooth' });
                            }, 150);
                          }
                        }}
                        className="w-full h-24 md:h-28 text-xl md:text-2xl font-black shadow-2xl hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.4)] transition-all duration-300 border-4 border-blue-600 bg-gradient-to-br from-white via-blue-50 to-cyan-50 hover:from-blue-50 hover:via-blue-100 hover:to-cyan-100 relative overflow-hidden group"
                        style={{
                          boxShadow: `0 20px 40px -12px ${hexToRgba(primaryColor, 0.3)}, 0 0 0 1px rgba(59,130,246,0.2) inset`,
                          color: primaryColor,
                        }}
                      >
                        {/* Animated gradient overlay */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-600/20 to-transparent"
                          animate={{ x: [-200, 200] }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        />
                        {/* Pulsing glow effect */}
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-br from-blue-200/30 to-cyan-200/30"
                          animate={{ opacity: [0.3, 0.6, 0.3] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="relative z-10 flex flex-col items-center justify-center gap-2">
                          <div className="flex items-center gap-3">
                            <motion.span
                              animate={{ rotate: [0, -15, 15, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="text-3xl"
                            >
                              📞
                            </motion.span>
                            <span className="tracking-wide" style={{ color: primaryColor }}>Schedule a Callback</span>
                          </div>
                          <span className="text-sm md:text-base font-semibold opacity-90" style={{ color: primaryColor }}>
                            We'll call you to discuss your needs
                          </span>
                        </div>
                      </Button>
                    </motion.div>
                  </motion.div>
                )}

                {/* Appointment Booking Section */}
                {quoteResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {appointmentConfirmed ? (
                      <div ref={appointmentFormRef}>
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
                      </div>
                    ) : showAppointmentForm ? (
                      <div ref={appointmentFormRef}>
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

                          <CalendarBooking
                            type="appointment"
                            onConfirm={(date, time, notes) => {
                              setAppointmentDate(date);
                              setAppointmentTime(time);
                              setAppointmentNotes(notes);
                              handleBookAppointment();
                            }}
                            onCancel={() => {
                              setShowAppointmentForm(false);
                              setBookingMessage(null);
                              setAppointmentDate('');
                              setAppointmentTime('');
                              setAppointmentNotes('');
                            }}
                            isBooking={isBookingAppointment}
                            primaryColor={primaryColor}
                          />
                        </CardContent>
                        </Card>
                      </div>
                    ) : null}
                  </motion.div>
                )}

                {/* Call Booking Section */}
                {quoteResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    {callConfirmed ? (
                      <div ref={callFormRef}>
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
                      </div>
                    ) : showCallForm ? (
                      <div ref={callFormRef}>
                        <Card className="shadow-2xl border-0 overflow-hidden">
                          <div 
                            className="p-6 border-b"
                          style={{
                            background: `linear-gradient(to right, ${hexToRgba(primaryColor, 0.05)}, transparent)`
                          }}
                        >
                          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            📞 Schedule a Callback
                          </h3>
                          <p className="text-gray-600 mt-2 font-semibold">We'll call you at your preferred time to discuss your cleaning needs and answer any questions</p>
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

                          <CalendarBooking
                            type="call"
                            onConfirm={(date, time, notes) => {
                              setCallDate(date);
                              setCallTime(time);
                              setCallNotes(notes);
                              handleBookCall(date, time, notes);
                            }}
                            onCancel={() => {
                              setShowCallForm(false);
                              setBookingMessage(null);
                              setCallDate('');
                              setCallTime('');
                              setCallNotes('');
                            }}
                            isBooking={isBookingCall}
                            primaryColor={primaryColor}
                          />
                        </CardContent>
                        </Card>
                      </div>
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
                      setHouseDetails(null);
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
                    className="text-gray-600 hover:text-gray-900 border-2 border-gray-300 hover:border-gray-500 transition-all hover:shadow-md"
                  >
                    ↻ Get Another Quote
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

  const mainDivStyle: React.CSSProperties & Record<string, string> = {
    '--primary-color': primaryColor,
  };
  return (
    <div style={mainDivStyle}>
      <style>{`
        :root {
          --primary-color: ${primaryColor};
        }
        .primary-bg { background-color: var(--primary-color); }
        .primary-text { color: var(--primary-color); }
        .primary-border { border-color: var(--primary-color); }
        .primary-gradient { background: linear-gradient(to right, var(--primary-color), ${hexToRgba(primaryColor, 0.7)}); }
        
        /* Input focus colors */
        input:focus-visible,
        input:focus {
          --tw-ring-color: ${primaryColor} !important;
          border-color: ${primaryColor} !important;
        }
        
        /* Select focus colors */
        button[role="combobox"]:focus,
        [role="combobox"]:focus-visible {
          --tw-ring-color: ${primaryColor} !important;
        }
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
                        placeholder={currentQuestion.placeholder}
                        required={currentQuestion.required}
                        primaryColor={primaryColor}
                        value={watch(getFormFieldName(currentQuestion.id) as any) || ''}
                        onChange={async (value, placeDetails) => {
                          // Update form value using sanitized field name
                          const fieldName = getFormFieldName(currentQuestion.id);
                          console.log('Address onChange called:', { fieldName, value, hasPlaceDetails: !!placeDetails });
                          
                          // Set the form value and trigger validation immediately
                          // Use shouldValidate: true to mark the field as valid
                          setValue(fieldName as any, value, { shouldValidate: true, shouldDirty: true });
                          
                          // Wait for validation to complete
                          const isValid = await trigger(fieldName as any).catch(err => {
                            console.error('Validation trigger error:', err);
                            return false;
                          });
                          
                          // Store coordinates for service area check
                          // Only set coordinates if they're valid (not 0,0 or NaN)
                          if (placeDetails) {
                            const { lat, lng } = placeDetails;
                            if (lat && lng && lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
                              console.log('Setting valid address coordinates:', { lat, lng, address: value });
                              setAddressCoordinates({ lat, lng });
                              // Reset service area check flag when new coordinates are set
                              setServiceAreaChecked(false);
                              
                              // If validation passed and we have valid coordinates, check service area first
                              // Then auto-advance only if in service area
                              if (isValid) {
                                // Wait a moment to ensure state is updated, then check service area and advance
                                setTimeout(async () => {
                                  // Run service area check before auto-advancing
                                  try {
                                    console.log('Auto-advance: Checking service area with coordinates:', { lat, lng });
                                    const response = await fetch('/api/service-area/check', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ lat, lng }),
                                    });
                                    const result = await response.json();
                                    console.log('Auto-advance: Service area check result:', result);
                                    
                                    if (result.inServiceArea) {
                                      // In service area - mark as checked and advance
                                      setServiceAreaChecked(true);
                                      nextStep();
                                    } else {
                                      // Out of service area - redirect directly without advancing
                                      console.log('Auto-advance: Address is out of service area - redirecting');
                                      const data = getValues();
                                      const addressFieldName = getFormFieldName(currentQuestion.id);
                                      const addressValue = data[addressFieldName] || data.address || '';
                                      
                                      // Create out-of-service contact
                                      try {
                                        await fetch('/api/service-area/out-of-service', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            firstName: data.firstName || '',
                                            lastName: data.lastName || '',
                                            email: data.email || '',
                                            phone: data.phone || '',
                                            address: addressValue,
                                          }),
                                        });
                                      } catch (error) {
                                        console.error('Error creating out-of-service contact:', error);
                                      }
                                      
                                      // Redirect to out-of-service page
                                      const params = new URLSearchParams({
                                        data: JSON.stringify({
                                          firstName: data.firstName || '',
                                          lastName: data.lastName || '',
                                          email: data.email || '',
                                          phone: data.phone || '',
                                          address: addressValue,
                                        }),
                                      });
                                      window.location.href = `/out-of-service?${params.toString()}`;
                                    }
                                  } catch (error) {
                                    console.error('Auto-advance: Error checking service area:', error);
                                    // If service area check fails, don't auto-advance (user can click Next manually)
                                  }
                                }, 200);
                              }
                            } else {
                              console.warn('Invalid coordinates received, not setting:', { lat, lng, address: value });
                            }
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

                    {currentQuestion.type === 'number' && currentQuestion.id !== 'squareFeet' && (() => {
                      // Generate number options based on question type
                      // Default range: 0-10, but can be customized per question
                      const getNumberOptions = (questionId: string): number[] => {
                        const id = questionId.toLowerCase();
                        if (id.includes('bath') || id.includes('pets') || id.includes('shedding')) {
                          // Baths and pets: 0-5
                          return [0, 1, 2, 3, 4, 5];
                        } else if (id.includes('people') || id.includes('person') || id.includes('resident')) {
                          // People: 1-10
                          return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                        } else {
                          // Default: 0-10
                          return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                        }
                      };

                      const numberOptions = getNumberOptions(currentQuestion.id);
                      const currentValue = watch(getFormFieldName(currentQuestion.id) as any);

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-6 gap-3 sm:gap-4">
                            {numberOptions.map((num) => {
                              const isSelected = currentValue === num;
                              return (
                                <motion.button
                                  key={num}
                                  type="button"
                                  whileHover={{ scale: 1.08, y: -2 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={async () => {
                                    const fieldName = getFormFieldName(currentQuestion.id);
                                    // Set the value
                                    setValue(fieldName as any, num, { shouldValidate: true, shouldDirty: true });
                                    
                                    // Trigger validation
                                    const isValid = await trigger(fieldName as any);
                                    
                                    // Auto-advance after a brief delay if valid
                                    if (isValid) {
                                      setTimeout(() => {
                                        nextStep();
                                      }, 200);
                                    }
                                  }}
                                  className={`
                                    relative h-20 sm:h-24 md:h-28 rounded-2xl sm:rounded-3xl font-medium 
                                    text-xs sm:text-sm md:text-sm
                                    transition-all duration-300 border-2 shadow-lg
                                    flex items-center justify-center
                                    ${isSelected 
                                      ? 'shadow-2xl' 
                                      : 'hover:shadow-xl bg-gradient-to-br from-gray-50 to-white'
                                    }
                                  `}
                                  style={{
                                    backgroundColor: isSelected ? primaryColor : 'white',
                                    color: isSelected ? 'white' : '#374151',
                                    borderColor: isSelected ? primaryColor : '#d1d5db',
                                    boxShadow: isSelected ? `0 20px 25px -5px ${hexToRgba(primaryColor, 0.3)}, 0 10px 10px -5px ${hexToRgba(primaryColor, 0.15)}, 0 0 0 4px ${hexToRgba(primaryColor, 0.2)}` : undefined,
                                  }}
                                >
                                  {isSelected ? (
                                    <motion.div
                                      initial={{ scale: 0, rotate: -180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
                                      className="relative z-10"
                                    >
                                      {num}
                                    </motion.div>
                                  ) : (
                                    <span className="relative z-10">{num}</span>
                                  )}
                                  {isSelected && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="absolute inset-0 rounded-2xl sm:rounded-3xl"
                                      style={{
                                        background: `linear-gradient(135deg, ${primaryColor}, ${hexToRgba(primaryColor, 0.85)})`,
                                      }}
                                    />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                          <p className="text-sm text-gray-500 text-center mt-2">
                            Click a number to select
                          </p>
                        </div>
                      );
                    })()}

                    {(currentQuestion.type === 'select' || currentQuestion.id === 'squareFeet') && (() => {
                      // Get options for select/square footage questions
                      const getSelectOptions = () => {
                        // Square footage options if no custom options
                        if (currentQuestion.id === 'squareFeet' && (!currentQuestion.options || currentQuestion.options.length === 0)) {
                          return [
                            { value: 'Less Than 1500', label: 'Less Than 1500' },
                            { value: '1501-2000', label: '1501-2000' },
                            { value: '2001-2500', label: '2001-2500' },
                            { value: '2501-3000', label: '2501-3000' },
                            { value: '3001-3500', label: '3001-3500' },
                            { value: '3501-4000', label: '3501-4000' },
                            { value: '4001-4500', label: '4001-4500' },
                            { value: '4501-5000', label: '4501-5000' },
                            { value: '5001-5500', label: '5001-5500' },
                            { value: '5501-6000', label: '5501-6000' },
                            { value: '6001-6500', label: '6001-6500' },
                            { value: '6501-7000', label: '6501-7000' },
                            { value: '7001-7500', label: '7001-7500' },
                            { value: '7501-8000', label: '7501-8000' },
                            { value: '8001-8500', label: '8001-8500' },
                          ];
                        }
                        
                        // Use custom options from question
                        return (currentQuestion.options || [])
                          .filter(option => option.value && option.value.trim() !== '')
                          .map(option => ({
                            value: option.value,
                            label: option.label || option.value,
                          }));
                      };

                      const selectOptions = getSelectOptions();
                      const currentValue = watch(getFormFieldName(currentQuestion.id) as any);

                      // Determine grid columns based on number of options
                      const getGridCols = (count: number) => {
                        if (count <= 3) return 'grid-cols-3';
                        if (count <= 4) return 'grid-cols-4';
                        if (count <= 6) return 'grid-cols-3 sm:grid-cols-6';
                        return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
                      };

                      return (
                        <div className="space-y-4">
                          <div className={`grid ${getGridCols(selectOptions.length)} gap-3 sm:gap-4`}>
                            {selectOptions.map((option) => {
                              const isSelected = currentValue === option.value;
                              const { mainText, detailsText } = parseOptionLabel(option.label);
                              return (
                                <motion.button
                                  key={option.value}
                                  type="button"
                                  whileHover={{ scale: 1.05, y: -2 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={async () => {
                                    const fieldName = getFormFieldName(currentQuestion.id);
                                    // Set the value
                                    setValue(fieldName as any, option.value, { shouldValidate: true, shouldDirty: true });
                                    
                                    // Trigger validation
                                    const isValid = await trigger(fieldName as any);
                                    
                                    // Auto-advance after a brief delay if valid
                                    if (isValid) {
                                      setTimeout(() => {
                                        nextStep();
                                      }, 200);
                                    }
                                  }}
                                  className={`
                                    relative h-24 sm:h-28 md:h-32 rounded-2xl sm:rounded-3xl font-medium 
                                    text-xs sm:text-sm md:text-sm
                                    transition-all duration-300 border-2 shadow-lg
                                    flex flex-col items-center justify-center px-3 py-4
                                    text-center leading-tight
                                    ${isSelected 
                                      ? 'shadow-2xl' 
                                      : 'hover:shadow-xl bg-gradient-to-br from-gray-50 to-white'
                                    }
                                  `}
                                  style={{
                                    backgroundColor: isSelected ? primaryColor : 'white',
                                    color: isSelected ? 'white' : '#374151',
                                    borderColor: isSelected ? primaryColor : '#d1d5db',
                                    boxShadow: isSelected ? `0 20px 25px -5px ${hexToRgba(primaryColor, 0.3)}, 0 10px 10px -5px ${hexToRgba(primaryColor, 0.15)}, 0 0 0 4px ${hexToRgba(primaryColor, 0.2)}` : undefined,
                                  }}
                                >
                                  {isSelected ? (
                                    <motion.div
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                                      className="relative z-10 flex flex-col items-center justify-center gap-1"
                                    >
                                      <span className="text-xs sm:text-sm md:text-sm font-semibold leading-tight">{mainText}</span>
                                      {detailsText && (
                                        <span className="text-[10px] sm:text-[11px] md:text-xs opacity-90 font-normal leading-tight text-center px-1">
                                          {detailsText}
                                        </span>
                                      )}
                                    </motion.div>
                                  ) : (
                                    <span className="relative z-10 flex flex-col items-center justify-center gap-1">
                                      <span className="text-xs sm:text-sm md:text-sm font-semibold leading-tight">{mainText}</span>
                                      {detailsText && (
                                        <span className="text-[10px] sm:text-[11px] md:text-xs opacity-75 font-normal leading-tight text-center px-1">
                                          {detailsText}
                                        </span>
                                      )}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="absolute inset-0 rounded-2xl sm:rounded-3xl"
                                      style={{
                                        background: `linear-gradient(135deg, ${primaryColor}, ${hexToRgba(primaryColor, 0.85)})`,
                                      }}
                                    />
                                  )}
                                </motion.button>
                              );
                            })}
                          </div>
                          <p className="text-sm text-gray-500 text-center mt-2">
                            Click an option to select
                          </p>
                        </div>
                      );
                    })()}

                    {errors[getFormFieldName(currentQuestion.id) as any] && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-red-500 mt-2 font-medium"
                        data-field-error={getFormFieldName(currentQuestion.id)}
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
          className="flex justify-center items-center mt-8 gap-6 md:gap-12 lg:gap-16"
        >
          <Button
            onClick={prevStep}
            disabled={currentStep === 0}
            variant="outline"
            size="lg"
            className="flex items-center gap-2 disabled:opacity-50 min-w-[140px]"
          >
            <ChevronLeft className="h-5 w-5" />
            Previous
          </Button>

          <Button
            onClick={nextStep}
            disabled={isLoading}
            size="lg"
            className="flex items-center gap-2 min-w-[140px]"
            style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = primaryColor;
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = primaryColor;
              e.currentTarget.style.opacity = '1';
            }}
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
