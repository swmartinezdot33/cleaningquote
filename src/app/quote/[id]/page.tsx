'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, AlertCircle, Calendar, Clock } from 'lucide-react';
import { CalendarBooking } from '@/components/CalendarBooking';

interface QuoteResponse {
  outOfLimits: boolean;
  message?: string;
  multiplier?: number;
  initialCleaningRequired?: boolean;
  initialCleaningRecommended?: boolean;
  inputs?: {
    squareFeet: number;
    bedrooms: number;
    fullBaths: number;
    halfBaths: number;
    people: number;
    pets: number;
    sheddingPets: number;
    condition?: string;
    cleanedWithin3Months?: boolean;
  };
  ranges?: {
    weekly: { low: number; high: number };
    biWeekly: { low: number; high: number };
    fourWeek: { low: number; high: number };
    initial: { low: number; high: number };
    deep: { low: number; high: number };
    general: { low: number; high: number };
    moveInOutBasic: { low: number; high: number };
    moveInOutFull: { low: number; high: number };
  };
  summaryText?: string;
  smsText?: string;
  ghlContactId?: string;
  quoteId?: string;
  contactData?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  serviceType?: string;
  frequency?: string;
  /** Labels from stored survey (Survey Builder) — single source of truth */
  serviceTypeLabel?: string;
  frequencyLabel?: string;
  serviceTypeOptions?: Array<{ value: string; label: string }>;
  frequencyOptions?: Array<{ value: string; label: string }>;
  /** Maps canonical keys (move-in, four-week) and option values to display labels from Survey Builder */
  serviceTypeLabels?: Record<string, string>;
  frequencyLabels?: Record<string, string>;
}

// Helper function to convert hex to rgba
const hexToRgba = (hex: string, alpha: number = 1) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper function to convert hex to HSL
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

export default function QuotePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = (params.id ?? (params as { quoteId?: string }).quoteId) as string;
  const slug = typeof params.slug === 'string' ? params.slug : undefined;

  // Preserve all query params (UTM, start, gclid, etc.) through appointment/callback redirects
  const getPassthroughParams = (): string => {
    const p = new URLSearchParams();
    searchParams.forEach((value, key) => p.set(key, value));
    return p.toString();
  };
  
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetTitle, setWidgetTitle] = useState('Get Your Quote');
  const [primaryColor, setPrimaryColor] = useState('#0d9488');
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [showCallForm, setShowCallForm] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isBookingCall, setIsBookingCall] = useState(false);
  const [callMessage, setCallMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [appointmentConfirmed, setAppointmentConfirmed] = useState(false);
  const [callConfirmed, setCallConfirmed] = useState(false);
  const calendarRef = React.useRef<HTMLDivElement>(null);

  // Load widget settings (title, primary color). When under /t/[slug]/quote/[id], use slug-scoped API.
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const url = slug ? `/api/tools/${slug}/widget-settings` : '/api/admin/widget-settings';
        const widgetResponse = await fetch(url);
        if (widgetResponse.ok) {
          const widgetData = await widgetResponse.json();
          setWidgetTitle(widgetData.title || 'Get Your Quote');
          setPrimaryColor(widgetData.primaryColor || '#0d9488');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, [slug]);

  // Fetch quote data
  useEffect(() => {
    const fetchQuote = async () => {
      if (!quoteId) {
        setError('Quote ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(`/api/quote/${quoteId}`);
        // When under /t/[slug]/quote/[id], widget is loaded from slug-scoped API below

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch quote');
        }

        const data = await response.json();
        setQuoteResult(data);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError(err instanceof Error ? err.message : 'Failed to load quote');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuote();
  }, [quoteId]);

  // Auto-scroll to calendar when appointment or call form opens
  useEffect(() => {
    if ((showAppointmentForm || showCallForm) && calendarRef.current) {
      setTimeout(() => {
        calendarRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
        window.scrollBy({ top: -20, behavior: 'smooth' });
      }, 200);
    }
  }, [showAppointmentForm, showCallForm]);

  const handleBookAppointment = async (date?: string, time?: string, notes?: string, timestamp?: number) => {
    const finalDate = date || appointmentDate;
    const finalTime = time || appointmentTime;
    const finalNotes = notes || appointmentNotes;
    const finalTimestamp = timestamp || (finalDate && finalTime ? new Date(`${finalDate}T${finalTime}`).getTime() : undefined);

    if (!finalDate || !finalTime) {
      setBookingMessage({ type: 'error', text: 'Please select a date and time' });
      return;
    }

    if (!quoteResult?.ghlContactId) {
      setBookingMessage({
        type: 'error',
        text: 'Unable to book appointment. Contact information not available.',
      });
      return;
    }

    setIsBookingAppointment(true);
    setBookingMessage(null);

    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: quoteResult.ghlContactId,
          date: finalDate,
          time: finalTime,
          timestamp: finalTimestamp,
          notes: finalNotes,
          type: 'appointment',
          serviceType: quoteResult.serviceType,
          frequency: quoteResult.frequency,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to confirmation with all query params preserved (UTM, start, etc.)
        const qs = getPassthroughParams();
        const base = slug ? `/t/${slug}/quote/${quoteId}` : `/quote/${quoteId}`;
        const confirmationUrl = `${base}/appointment-confirmed${qs ? `?${qs}` : ''}`;
        
        // If embedded in iframe, notify parent and update iframe src
        if (window.location.search.includes('embedded=true') || window.self !== window.top) {
          // Notify parent widget of navigation
          if (window.parent && window.parent !== window) {
            try {
              window.parent.postMessage({
                type: 'widget:navigate',
                url: `${window.location.origin}${confirmationUrl}`,
              }, '*'); // Use '*' for cross-origin iframe support
            } catch (e) {
              console.log('Could not notify parent of navigation:', e);
            }
          }
          // Update iframe location
          window.location.href = confirmationUrl;
        } else {
          // Normal redirect for non-embedded pages
          window.location.href = confirmationUrl;
        }
        return;
      } else {
        if (data.details && typeof data.details === 'string') {
          console.warn('Appointment create API details (see Network tab for full response):', data.details);
        }
        setBookingMessage({
          type: 'error',
          text: data.userMessage || data.error || 'Failed to book appointment',
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

  const handleScheduleCall = async (date?: string, time?: string, notes?: string, timestamp?: number) => {
    if (!quoteResult?.ghlContactId) {
      setCallMessage({
        type: 'error',
        text: 'Unable to schedule call. Contact information not available.',
      });
      return;
    }

    setIsBookingCall(true);
    setCallMessage(null);

    try {
      const response = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: quoteResult.ghlContactId,
          date: date,
          time: time,
          timestamp: timestamp,
          notes: notes,
          type: 'call',
          serviceType: quoteResult.serviceType,
          frequency: quoteResult.frequency,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to confirmation with all query params preserved (UTM, start, etc.)
        const qs = getPassthroughParams();
        const base = slug ? `/t/${slug}/quote/${quoteId}` : `/quote/${quoteId}`;
        const confirmationUrl = `${base}/callback-confirmed${qs ? `?${qs}` : ''}`;
        
        // If embedded in iframe, notify parent and update iframe src
        if (window.location.search.includes('embedded=true') || window.self !== window.top) {
          // Notify parent widget of navigation
          if (window.parent && window.parent !== window) {
            try {
              window.parent.postMessage({
                type: 'widget:navigate',
                url: `${window.location.origin}${confirmationUrl}`,
              }, '*'); // Use '*' for cross-origin iframe support
            } catch (e) {
              console.log('Could not notify parent of navigation:', e);
            }
          }
          // Update iframe location
          window.location.href = confirmationUrl;
        } else {
          // Normal redirect for non-embedded pages
          window.location.href = confirmationUrl;
        }
        return;
      } else {
        if (data.details && typeof data.details === 'string') {
          console.warn('Call create API details (see Network tab for full response):', data.details);
        }
        setCallMessage({
          type: 'error',
          text: data.userMessage || data.error || 'Failed to schedule call',
        });
      }
    } catch (error) {
      console.error('Error scheduling call:', error);
      setCallMessage({
        type: 'error',
        text: 'Failed to schedule call. Please try again.',
      });
    } finally {
      setIsBookingCall(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-pink-600" />
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error || !quoteResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h2>
              <p className="text-gray-600 mb-6">{error || 'The quote you are looking for could not be found.'}</p>
              <Button onClick={() => {
                const p = new URLSearchParams(getPassthroughParams());
                p.set('startAt', 'address');
                router.push(slug ? `/t/${slug}?${p.toString()}` : `/?${p.toString()}`);
              }}>Start New Quote</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quoteResult.outOfLimits) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Out of Limits</h2>
              <p className="text-gray-700 mb-6">{quoteResult.message}</p>
              <Button onClick={() => {
                const p = new URLSearchParams(getPassthroughParams());
                p.set('startAt', 'address');
                if (quoteResult?.ghlContactId) p.set('contactId', quoteResult.ghlContactId);
                router.push(slug ? `/t/${slug}?${p.toString()}` : `/?${p.toString()}`);
              }}>Start New Quote</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryHsl = hexToHsl(primaryColor);

  return (
    <div>
      <style>{`
        :root {
          --primary-color: ${primaryColor};
          --primary: ${primaryHsl};
          --ring: ${primaryHsl};
        }
        .primary-from { background: linear-gradient(to right, var(--primary-color), ${hexToRgba(primaryColor, 0.6)}); }
        .primary-bg { background-color: var(--primary-color); }
        .primary-text { color: var(--primary-color); }
        .primary-border { border-color: var(--primary-color); }
      `}</style>
      <main
        className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pt-12 pb-20 px-4 sm:px-6 lg:px-8"
        style={{
          backgroundImage: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.05)} 0%, transparent 50%, ${hexToRgba(primaryColor, 0.05)} 100%)`,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-6">
              {/* Quote Summary Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
              >
              </motion.div>

              {/* Beautiful Quote Card - Matching Screenshot Design */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="shadow-2xl border-0 overflow-hidden relative bg-white rounded-2xl">
                  {/* Pink Header - Matching Screenshot */}
                  <div
                    className="px-6 py-5 text-white relative overflow-hidden rounded-t-2xl"
                    style={{
                      background: primaryColor,
                    }}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-white/90 text-xs font-semibold tracking-wider mb-1 uppercase">YOUR QUOTE</p>
                        <h3 className="text-2xl md:text-3xl font-bold">Your Perfect Quote</h3>
                      </div>
                      <div className="text-white opacity-90">
                        <Sparkles className="h-8 w-8" />
                      </div>
                    </div>
                  </div>

                  {/* Quote Content - White Background */}
                  <CardContent className="p-6 bg-white">
                    <div className="space-y-5">
                      {/* House Details - Light Gray Background */}
                      {quoteResult.inputs && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                          className="bg-gray-100 px-4 py-3 rounded-lg"
                        >
                          <h4 className="font-semibold text-base text-gray-900 mb-2">House Details</h4>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                            <div>
                              <span className="font-medium">SqFt:</span>{' '}
                              <span className="text-gray-900">
                                {typeof quoteResult.inputs.squareFeet === 'number' 
                                  ? quoteResult.inputs.squareFeet 
                                  : quoteResult.inputs.squareFeet || '0-1500'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Bedrooms:</span>{' '}
                              <span className="text-gray-900">{quoteResult.inputs.bedrooms ?? 0}</span>
                            </div>
                            <div>
                              <span className="font-medium">Full Baths:</span>{' '}
                              <span className="text-gray-900">{quoteResult.inputs.fullBaths ?? 0}</span>
                            </div>
                            <div>
                              <span className="font-medium">Half Baths:</span>{' '}
                              <span className="text-gray-900">{quoteResult.inputs.halfBaths ?? 0}</span>
                            </div>
                            {quoteResult.inputs.people !== undefined && quoteResult.inputs.people !== null && (
                              <div>
                                <span className="font-medium">People:</span>{' '}
                                <span className="text-gray-900">{quoteResult.inputs.people}</span>
                              </div>
                            )}
                            {quoteResult.inputs.sheddingPets !== undefined && quoteResult.inputs.sheddingPets !== null && (
                              <div>
                                <span className="font-medium">Shedding Pets:</span>{' '}
                                <span className="text-gray-900">{quoteResult.inputs.sheddingPets}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}

                      {/* YOUR SELECTED SERVICE - Labels from API (stored survey); no hardcoding */}
                      {quoteResult.ranges && (() => {
                        const rawServiceType = (quoteResult.serviceType || '').toLowerCase().trim().replace(/\s+/g, ' ');
                        let frequency = (quoteResult.frequency || '').toLowerCase().trim();
                        
                        let serviceType = rawServiceType;
                        if (serviceType.includes('move') && (serviceType.includes('out') || serviceType === 'move_out' || serviceType === 'moveout')) {
                          serviceType = 'move-out';
                        } else if (serviceType.includes('move') || serviceType === 'move_in' || serviceType === 'movein') {
                          serviceType = 'move-in';
                        } else if (serviceType.includes('deep') || serviceType === 'deep_clean') {
                          serviceType = 'deep';
                        } else if (serviceType.includes('general') || serviceType === 'general_cleaning') {
                          serviceType = 'general';
                        } else if (serviceType.includes('initial') || serviceType === 'initial_cleaning') {
                          serviceType = 'initial';
                        }
                        
                        if (frequency === 'biweekly') frequency = 'bi-weekly';
                        else if (frequency === 'fourweek' || frequency === 'monthly') frequency = 'four-week';
                        const hasRecurringFrequency = ['weekly', 'bi-weekly', 'four-week'].includes(frequency);
                        const isRecurringService = hasRecurringFrequency;
                        
                        // Human-friendly fallbacks when Survey Builder label isn't found (never show raw keys like "four-week" or "general")
                        const serviceLabelFallback: Record<string, string> = {
                          'initial': 'Initial Deep Cleaning',
                          'general': 'General Clean',
                          'deep': 'Deep Clean',
                          'move-in': 'Move In Clean',
                          'move-out': 'Move Out Clean',
                        };
                        const freqLabelFallback: Record<string, string> = {
                          'weekly': 'Weekly',
                          'bi-weekly': 'Bi-Weekly (Every 2 Weeks)',
                          'biweekly': 'Bi-Weekly (Every 2 Weeks)',
                          'four-week': 'Every 4 Weeks',
                          'monthly': 'Every 4 Weeks',
                          'every-4-weeks': 'Every 4 Weeks',
                        };
                        // Display uses option.label (left input in Survey Builder) — short, human-friendly
                        const getServiceLabel = (value: string) =>
                          quoteResult.serviceTypeLabels?.[value]
                          ?? quoteResult.serviceTypeLabels?.[value?.toLowerCase()]
                          ?? quoteResult.serviceTypeOptions?.find(o => o.value === value || o.value.toLowerCase() === value)?.label
                          ?? serviceLabelFallback[value?.toLowerCase()]
                          ?? (value ? value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : value);
                        const getFreqLabel = (value: string) =>
                          quoteResult.frequencyLabels?.[value]
                          ?? quoteResult.frequencyLabels?.[value?.toLowerCase()]
                          ?? quoteResult.frequencyLabels?.[value === 'biweekly' ? 'bi-weekly' : value]
                          ?? quoteResult.frequencyOptions?.find(o => o.value === value || o.value.toLowerCase() === value || (value === 'biweekly' && o.value === 'bi-weekly'))?.label
                          ?? freqLabelFallback[value?.toLowerCase()]
                          ?? (value ? value.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : value);
                        // Map option value/label to canonical key for range lookup (mirrors server inference)
                        const getCanonicalServiceKey = (value: string, label: string): string | null => {
                          const v = (value || '').toLowerCase().trim();
                          const l = (label || '').toLowerCase();
                          const combined = `${v} ${l}`;
                          if (v === 'initial') return 'initial';
                          if (v === 'general') return 'general';
                          if (v === 'deep') return 'deep';
                          if (v === 'move-in') return 'move-in';
                          if (v === 'move-out') return 'move-out';
                          if (combined.includes('move-out') || combined.includes('move out') || (combined.includes('deep') && combined.includes('move'))) return 'move-out';
                          if (combined.includes('move-in') || combined.includes('move in') || (combined.includes('basic') && combined.includes('move'))) return 'move-in';
                          if (combined.includes('initial deep') || (combined.includes('initial') && combined.includes('deep') && !combined.includes('general'))) return 'initial';
                          if (combined.includes('initial general') || (combined.includes('initial') && combined.includes('general'))) return 'general';
                          if (combined.includes('one time deep') || combined.includes('one time clean') || (combined.includes('deep') && !combined.includes('move') && !combined.includes('initial'))) return 'deep';
                          return null;
                        };
                        const getRangeForServiceKey = (key: string): { low: number; high: number } | null => {
                          if (!quoteResult.ranges) return null;
                          if (key === 'initial') return quoteResult.ranges.initial;
                          if (key === 'general') return quoteResult.ranges.general;
                          if (key === 'deep') return quoteResult.ranges.deep;
                          if (key === 'move-in') return quoteResult.ranges.moveInOutBasic;
                          if (key === 'move-out') return quoteResult.ranges.moveInOutFull;
                          return null;
                        };
                        const selectedServiceKey = getCanonicalServiceKey(serviceType, quoteResult.serviceTypeLabel || serviceType || '') ?? (['move-in', 'move-out', 'deep', 'initial', 'general'].includes(serviceType) ? serviceType : null);
                        
                        let selectedRange: { low: number; high: number } | null = null;
                        if (serviceType === 'move-in') selectedRange = quoteResult.ranges.moveInOutBasic;
                        else if (serviceType === 'move-out') selectedRange = quoteResult.ranges.moveInOutFull;
                        else if (serviceType === 'deep') selectedRange = quoteResult.ranges.deep;
                        else if (frequency === 'weekly') selectedRange = quoteResult.ranges.weekly;
                        else if (frequency === 'bi-weekly') selectedRange = quoteResult.ranges.biWeekly;
                        else if (frequency === 'four-week') selectedRange = quoteResult.ranges.fourWeek;
                        else selectedRange = quoteResult.ranges.general;
                        
                        const selectedServiceName = isRecurringService
                          ? (quoteResult.frequencyLabel || getFreqLabel(frequency))
                          : (quoteResult.serviceTypeLabel || getServiceLabel(serviceType));
                        const isOneTimeService = ['move-in', 'move-out', 'deep'].includes(serviceType);

                        return (
                          <>
                            {/* YOUR SELECTED SERVICE - Green Background */}
                            {selectedRange && (
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-green-50 px-4 py-4 rounded-lg border border-green-200"
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">✓</span>
                                    </div>
                                    <span className="text-xs text-green-600">+</span>
                                  </div>
                                  <p className="text-xs font-semibold text-green-800 uppercase tracking-wide">YOUR SELECTED SERVICE</p>
                                </div>
                                <div className="ml-8">
                                  <p className="font-bold text-lg text-gray-900">
                                    {selectedServiceName}: <span className="text-gray-700">${selectedRange.low} to ${selectedRange.high}</span>
                                  </p>
                                </div>
                              </motion.div>
                            )}

                            {/* INITIAL CLEANING - Show prominently if REQUIRED (for recurring services) */}
                            {quoteResult.initialCleaningRequired && isRecurringService && quoteResult.ranges?.initial && (
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.12 }}
                                className="space-y-2 mt-4"
                              >
                                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">📌 REQUIRED FIRST SERVICE:</p>
                                
                                {/* Initial Deep Cleaning - Required (Orange highlight) */}
                                <div className="bg-orange-50 border-2 border-orange-400 px-4 py-3 rounded-lg flex items-center gap-3">
                                  <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-xs font-bold">📌</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900">{getServiceLabel('initial')}:</span>
                                      <span className="text-gray-700">${quoteResult.ranges.initial.low} to ${quoteResult.ranges.initial.high}</span>
                                    </div>
                                    <p className="text-xs text-orange-800 font-medium mt-1">📌 Required before your recurring service begins</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* INITIAL CLEANING - Show as recommendation if RECOMMENDED (for recurring services) */}
                            {quoteResult.initialCleaningRecommended && !quoteResult.initialCleaningRequired && isRecurringService && quoteResult.ranges?.general && (
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.13 }}
                                className="space-y-2 mt-4"
                              >
                                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">💡 RECOMMENDED FIRST SERVICE:</p>
                                
                                {/* Initial General Clean - Recommended (Blue highlight) */}
                                <div className="bg-blue-50 border-2 border-blue-300 px-4 py-3 rounded-lg flex items-center gap-3">
                                  <div className="w-5 h-5 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
                                    <span className="text-blue-900 text-xs font-bold">💡</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900">{getServiceLabel('general')}:</span>
                                      <span className="text-gray-700">${quoteResult.ranges.general.low} to ${quoteResult.ranges.general.high}</span>
                                    </div>
                                    <p className="text-xs text-blue-800 font-medium mt-1">💡 Recommended for best results before your recurring service</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Always show Bi-Weekly with star as Most Popular when not selected (one-time and recurring) */}
                            {frequency !== 'bi-weekly' && quoteResult.ranges?.biWeekly && (
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15 }}
                                className="space-y-2 mt-4"
                              >
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">⭐ MOST POPULAR RECURRING CHOICE:</p>
                                
                                <div className="bg-yellow-50 border-2 border-yellow-300 px-4 py-3 rounded-lg flex items-center gap-3">
                                  <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                                    <span className="text-yellow-900 text-xs font-bold">⭐</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900">{getFreqLabel('bi-weekly')}:</span>
                                      <span className="text-gray-700">${quoteResult.ranges.biWeekly.low} to ${quoteResult.ranges.biWeekly.high}</span>
                                    </div>
                                    <p className="text-xs text-yellow-800 font-medium mt-1">⭐ Most Popular</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* OTHER SERVICE OPTIONS: all services from Survey Builder (left input = label) + recurring options */}
                            {quoteResult.ranges && (
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="space-y-2 mt-4"
                              >
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">OTHER SERVICE OPTIONS:</p>
                                
                                {/* All service types from survey (display = option.label, the left input) */}
                                {quoteResult.serviceTypeOptions?.map((opt) => {
                                  const key = getCanonicalServiceKey(opt.value, opt.label || opt.value);
                                  if (!key) return null;
                                  const range = getRangeForServiceKey(key);
                                  if (!range) return null;
                                  if (selectedServiceKey === key) return null;
                                  const displayLabel = opt.label || opt.value;
                                  return (
                                    <div key={opt.value} className="bg-white border border-gray-200 px-4 py-3 rounded-lg flex items-center gap-3">
                                      <span className="text-sm text-gray-400">✨</span>
                                      <div className="flex-1">
                                        <span className="font-semibold text-gray-900">{displayLabel}:</span>{' '}
                                        <span className="text-gray-700">${range.low} to ${range.high}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                {/* All recurring frequency options (Weekly, Bi-Weekly, Every 4 Weeks) — display = option.label (left input) */}
                                {quoteResult.frequencyOptions?.filter((f) => {
                                  const v = (f.value || '').toLowerCase();
                                  return v !== 'one-time' && v !== 'one time' && !v.includes('one time');
                                }).map((opt) => {
                                  const fv = (opt.value || '').toLowerCase();
                                  const fl = (opt.label || '').toLowerCase();
                                  const combined = `${fv} ${fl}`;
                                  let freqKey: string | null = null;
                                  if (fv === 'bi-weekly' || fv === 'biweekly' || combined.includes('bi-weekly') || combined.includes('bi weekly') || combined.includes('every 2')) freqKey = 'bi-weekly';
                                  else if (fv === 'four-week' || fv === 'monthly' || fv === 'every-4-weeks' || combined.includes('every 4') || combined.includes('4 weeks') || combined.includes('monthly')) freqKey = 'four-week';
                                  else if (fv === 'weekly' || combined.includes('weekly')) freqKey = 'weekly';
                                  if (!freqKey) return null;
                                  const range = freqKey === 'weekly' ? quoteResult.ranges!.weekly : freqKey === 'bi-weekly' ? quoteResult.ranges!.biWeekly : quoteResult.ranges!.fourWeek;
                                  const currentFreqNorm = frequency === 'biweekly' ? 'bi-weekly' : frequency === 'monthly' || frequency === 'every-4-weeks' ? 'four-week' : frequency;
                                  if (currentFreqNorm === freqKey) return null;
                                  const displayLabel = opt.label || opt.value;
                                  return (
                                    <div key={opt.value} className="bg-white border border-gray-200 px-4 py-3 rounded-lg flex items-center gap-3">
                                      <span className="text-sm text-gray-400">📅</span>
                                      <div className="flex-1">
                                        <span className="font-semibold text-gray-900">{displayLabel}:</span>{' '}
                                        <span className="text-gray-700">${range.low} to ${range.high}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}

                            {/* Professional Pricing Disclaimer */}
                            <div className="text-xs text-gray-500 flex items-center gap-1 pt-2">
                              <span className="text-red-500">*</span>
                              <span>Professional pricing * Customized for your needs</span>
                            </div>
                          </>
                        );
                      })()}

                      {/* Action Buttons - Matching Screenshot - ALWAYS SHOW */}
                      {quoteResult && !isLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="pt-4"
                        >
                          {!appointmentConfirmed && !callConfirmed ? (
                            <div className="flex flex-col sm:flex-row gap-3">
                              {/* Book an Appointment - Blue Button */}
                              <Button
                                onClick={() => {
                                  if (quoteResult.ghlContactId) {
                                    setShowAppointmentForm(true);
                                    setShowCallForm(false);
                                  } else {
                                    setBookingMessage({
                                      type: 'error',
                                      text: 'Contact information is being processed. Please try again in a moment.',
                                    });
                                  }
                                }}
                                disabled={!quoteResult.ghlContactId}
                                className="flex-1 h-14 text-base font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                              >
                                <Calendar className="h-5 w-5" />
                                <span>Book an Appointment</span>
                              </Button>
                              
                              {/* Schedule a Callback - Pink Button */}
                              <Button
                                onClick={() => {
                                  if (quoteResult.ghlContactId) {
                                    setShowCallForm(true);
                                    setShowAppointmentForm(false);
                                  } else {
                                    setCallMessage({
                                      type: 'error',
                                      text: 'Contact information is being processed. Please try again in a moment.',
                                    });
                                  }
                                }}
                                disabled={!quoteResult.ghlContactId}
                                className="flex-1 h-14 text-base font-semibold border-0 text-white rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                style={{ backgroundColor: primaryColor }}
                              >
                                <Clock className="h-5 w-5" />
                                <div className="flex flex-col items-start">
                                  <span>Schedule a Callback</span>
                                  <span className="text-xs opacity-90">We'll call you to discuss your needs</span>
                                </div>
                              </Button>
                            </div>
                          ) : (
                            <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                              <p className="text-green-800 text-sm font-semibold">
                                {appointmentConfirmed ? '✅ Appointment confirmed!' : '✅ Callback scheduled!'}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* Get Another Quote Link - Footer */}
                      <div className="pt-4 text-center">
                        <button
                          onClick={() => {
                            const p = new URLSearchParams(getPassthroughParams());
                            if (quoteResult?.ghlContactId) p.set('contactId', quoteResult.ghlContactId);
                            p.set('startAt', 'address');
                            router.push(slug ? `/t/${slug}?${p.toString()}` : `/?${p.toString()}`);
                          }}
                          className="text-sm font-medium primary-text hover:opacity-80 transition-opacity inline-flex items-center gap-1"
                          style={{ color: primaryColor }}
                        >
                          <span>⮑</span>
                          <span>Get Another Quote</span>
                        </button>
                      </div>

                      {/* Booking Messages */}
                      {bookingMessage && (
                        <div
                          className={`p-4 rounded-lg ${
                            bookingMessage.type === 'success'
                              ? 'bg-green-50 text-green-800 border border-green-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {bookingMessage.text}
                        </div>
                      )}

                      {callMessage && (
                        <div
                          className={`p-4 rounded-lg ${
                            callMessage.type === 'success'
                              ? 'bg-green-50 text-green-800 border border-green-200'
                              : 'bg-red-50 text-red-800 border border-red-200'
                          }`}
                        >
                          {callMessage.text}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Calendar Booking Component */}
              {showAppointmentForm && quoteResult.ghlContactId && (
                <Card className="shadow-lg">
                  <CardContent className="pt-6">
                    <div ref={calendarRef}>
                      <CalendarBooking
                        type="appointment"
                        onConfirm={(date, time, notes, timestamp) => {
                          setAppointmentDate(date);
                          setAppointmentTime(time);
                          setAppointmentNotes(notes);
                          handleBookAppointment(date, time, notes, timestamp);
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
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Call Form */}
              {showCallForm && quoteResult.ghlContactId && (
                <Card className="shadow-lg">
                  <CardContent className="pt-6">
                    <div ref={calendarRef}>
                      <CalendarBooking
                        type="call"
                        onConfirm={(date, time, notes, timestamp) => {
                          handleScheduleCall(date, time, notes, timestamp);
                        }}
                        onCancel={() => {
                          setShowCallForm(false);
                          setCallMessage(null);
                        }}
                        isBooking={isBookingCall}
                        primaryColor={primaryColor}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
