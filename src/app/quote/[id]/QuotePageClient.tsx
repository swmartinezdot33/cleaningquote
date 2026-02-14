'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, AlertCircle, Calendar, Clock, ChevronLeft } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';
import { CalendarBooking } from '@/components/CalendarBooking';
import { PreauthCardForm } from '@/components/PreauthCardForm';
import { getSquareFootageRangeDisplay } from '@/lib/pricing/format';

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
  /** GHL location business name for quote header (from Sub-Account / Location) */
  businessName?: string | null;
  /** GHL location contact details for footer (always up to date from Sub-Account) */
  locationContact?: {
    orgName: string;
    contactEmail: string | null;
    contactPhone: string | null;
    officeAddress: string | null;
  } | null;
}

// Helper function to convert hex to rgba (handles transparent / no color)
const hexToRgba = (hex: string, alpha: number = 1) => {
  if (!hex || hex === 'transparent' || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return 'rgba(0,0,0,0)';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Helper function to convert hex to HSL (handles transparent / no color)
const hexToHsl = (hex: string): string => {
  if (!hex || hex === 'transparent' || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return '0 0% 50%';
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

const DEFAULT_PRIMARY = '#7c3aed';

export default function QuotePageClient({
  initialPrimaryColor,
}: {
  initialPrimaryColor?: string;
}) {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = (params?.id ?? (params as { quoteId?: string })?.quoteId) as string;
  const slug = typeof params?.slug === 'string' ? params.slug : undefined;
  const toolSlug = typeof params?.toolSlug === 'string' ? params.toolSlug : undefined;
  // Org-scoped: /t/orgslug/toolslug/quote/id → start at /t/orgslug/toolslug
  const quoteStartPath = (slug && toolSlug) ? `/t/${slug}/${toolSlug}` : slug ? `/t/${slug}` : '/';
  const quoteBasePath = (slug && toolSlug) ? `/t/${slug}/${toolSlug}/quote/${quoteId}` : slug ? `/t/${slug}/quote/${quoteId}` : `/quote/${quoteId}`;

  // Preserve all query params (UTM, start, gclid, etc.) through appointment/callback redirects
  const getPassthroughParams = (): string => {
    const p = new URLSearchParams();
    searchParams?.forEach((value, key) => p.set(key, value));
    return p.toString();
  };
  
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetTitle, setWidgetTitle] = useState('Get Your Quote');
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor ?? DEFAULT_PRIMARY);
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
  const [appointmentReview, setAppointmentReview] = useState<{ date: string; time: string; notes: string; timestamp?: number } | null>(null);
  const calendarRef = React.useRef<HTMLDivElement>(null);

  // Load widget settings (title, primary color). When under /t/[slug]/quote/[id], use slug-scoped API.
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const apiSlug = (slug && toolSlug) ? toolSlug : slug;
        const url = apiSlug ? `/api/tools/${apiSlug}/widget-settings` : '/api/admin/widget-settings';
        const widgetResponse = await fetch(url);
        if (widgetResponse.ok) {
          const widgetData = await widgetResponse.json();
          setWidgetTitle(widgetData.title || 'Get Your Quote');
          setPrimaryColor(widgetData.primaryColor ?? DEFAULT_PRIMARY);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, [slug, toolSlug]);

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

  const handleBookAppointment = async (
    date?: string,
    time?: string,
    notes?: string,
    timestamp?: number,
    preauthCardInfo?: { cardNumber: string; nameOnCard: string; expMonth: string; expYear: string; cvv: string; cardType: string }
  ) => {
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
      const apiToolSlug = (slug && toolSlug) ? toolSlug : slug;
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
          ...(apiToolSlug && { toolSlug: apiToolSlug }),
          ...(preauthCardInfo && { preauthCardInfo }),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAppointmentReview(null);
        // Redirect to confirmation with all query params preserved (UTM, start, etc.)
        const qs = getPassthroughParams();
        const confirmationUrl = `${quoteBasePath}/appointment-confirmed${qs ? `?${qs}` : ''}`;
        
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
      const apiToolSlug = (slug && toolSlug) ? toolSlug : slug;
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
          ...(apiToolSlug && { toolSlug: apiToolSlug }),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to confirmation with all query params preserved (UTM, start, etc.)
        const qs = getPassthroughParams();
        const confirmationUrl = `${quoteBasePath}/callback-confirmed${qs ? `?${qs}` : ''}`;
        
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
          <LoadingDots size="lg" className="mx-auto mb-4 text-pink-600" />
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
              <Button 
                onClick={() => {
                  const p = new URLSearchParams(getPassthroughParams());
                  p.set('startAt', 'address');
                  router.push(`${quoteStartPath}?${p.toString()}`);
                }}
                style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
              >Start New Quote</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (quoteResult.outOfLimits) {
    const loc = quoteResult.locationContact;
    const hasContact = loc && (loc.orgName || loc.contactEmail || loc.contactPhone || loc.officeAddress);
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Out of Limits</h2>
              <p className="text-gray-700 mb-6">{quoteResult.message}</p>
              <Button 
                onClick={() => {
                  const p = new URLSearchParams(getPassthroughParams());
                  p.set('startAt', 'address');
                  if (quoteResult?.ghlContactId) p.set('contactId', quoteResult.ghlContactId);
                  router.push(`${quoteStartPath}?${p.toString()}`);
                }}
                style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
              >Start New Quote</Button>
              {hasContact && (
                <div className="mt-6 pt-5 border-t border-gray-200 text-left text-sm text-gray-600">
                  <p className="font-semibold text-gray-700 mb-1">{loc!.orgName || 'Contact us'}</p>
                  {loc!.contactPhone && <a href={`tel:${loc!.contactPhone.replace(/\s/g, '')}`} className="block hover:underline">{loc!.contactPhone}</a>}
                  {loc!.contactEmail && <a href={`mailto:${loc!.contactEmail}`} className="block hover:underline">{loc!.contactEmail}</a>}
                  {loc!.officeAddress && <span className="block">{loc!.officeAddress}</span>}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryHsl = hexToHsl(primaryColor);

  return (
    <div style={{ ['--quote-primary' as string]: primaryColor }}>
      <style>{`
        :root {
          --primary-color: var(--quote-primary-color, ${primaryColor});
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
                  {/* Header uses CSS var set by server so first paint has correct color */}
                  <div
                    className="px-6 py-5 text-white relative overflow-hidden rounded-t-2xl"
                    style={{
                      background: 'var(--quote-primary)',
                    }}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-white/90 text-xs font-semibold tracking-wider mb-1 uppercase">YOUR QUOTE</p>
                        <h3 className="text-2xl md:text-3xl font-bold">{quoteResult.businessName ?? 'Your Perfect Quote'}</h3>
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
                                  ? getSquareFootageRangeDisplay(quoteResult.inputs.squareFeet) + ' sq ft'
                                  : (quoteResult.inputs.squareFeet && String(quoteResult.inputs.squareFeet).includes('-')
                                    ? String(quoteResult.inputs.squareFeet) + ' sq ft'
                                    : quoteResult.inputs.squareFeet || '0-1500 sq ft')}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Bedrooms:</span>{' '}
                              <span className="text-gray-900">{quoteResult.inputs.bedrooms != null ? quoteResult.inputs.bedrooms : '—'}</span>
                            </div>
                            <div>
                              <span className="font-medium">Full Baths:</span>{' '}
                              <span className="text-gray-900">{quoteResult.inputs.fullBaths != null ? quoteResult.inputs.fullBaths : '—'}</span>
                            </div>
                            <div>
                              <span className="font-medium">Half Baths:</span>{' '}
                              <span className="text-gray-900">{quoteResult.inputs.halfBaths != null ? quoteResult.inputs.halfBaths : '—'}</span>
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
                        // Canonical key for selected-range logic (so "Move In Clean" -> move-in and we show correct selected service)
                        const canonicalServiceType = serviceType;
                        // For one-time types, ignore stored frequency so we don't show Bi-Weekly as selected
                        const effectiveFrequency = ['move-in', 'move-out', 'deep'].includes(canonicalServiceType) ? '' : frequency;
                        
                        if (frequency === 'biweekly') frequency = 'bi-weekly';
                        else if (frequency === 'fourweek' || frequency === 'monthly') frequency = 'four-week';
                        const hasRecurringFrequency = ['weekly', 'bi-weekly', 'four-week'].includes(effectiveFrequency);
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
                        // Map option value/label to canonical key for range lookup (mirrors server inference).
                        // Check Basic vs Deep in label FIRST so "Move-In/Move-Out Basic Clean" → moveInOutBasic, "Move-In/Move-Out Deep Clean" → moveInOutFull (different columns in pricing table).
                        const getCanonicalServiceKey = (value: string, label: string): string | null => {
                          const v = (value || '').toLowerCase().trim();
                          const l = (label || '').toLowerCase();
                          const combined = `${v} ${l}`;
                          if (v === 'initial') return 'initial';
                          if (v === 'general') return 'general';
                          if (v === 'deep') return 'deep';
                          // Move-in/move-out: distinguish Basic vs Deep by label first (both contain "move-out" in "Move-In/Move-Out")
                          if ((combined.includes('basic') && combined.includes('move')) || (l.includes('basic') && l.includes('move'))) return 'move-in';
                          if ((combined.includes('deep') && combined.includes('move')) || (l.includes('deep') && l.includes('move'))) return 'move-out';
                          if (combined.includes('move-out') || combined.includes('move out')) return 'move-out';
                          if (combined.includes('move-in') || combined.includes('move in')) return 'move-in';
                          if (v === 'move-out') return 'move-out';
                          if (v === 'move-in') return 'move-in';
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
                        const selectedServiceKey = getCanonicalServiceKey(serviceType, quoteResult.serviceTypeLabel || serviceType || '') ?? (['move-in', 'move-out', 'deep', 'initial', 'general'].includes(canonicalServiceType) ? canonicalServiceType : null);
                        
                        // Use label-derived key when available so "Move-In/Move-Out Deep Clean" gets correct range even if stored value was overwritten
                        let selectedRange: { low: number; high: number } | null = null;
                        if (effectiveFrequency === 'weekly') selectedRange = quoteResult.ranges.weekly;
                        else if (effectiveFrequency === 'bi-weekly') selectedRange = quoteResult.ranges.biWeekly;
                        else if (effectiveFrequency === 'four-week') selectedRange = quoteResult.ranges.fourWeek;
                        else if (selectedServiceKey && getRangeForServiceKey(selectedServiceKey)) selectedRange = getRangeForServiceKey(selectedServiceKey)!;
                        else if (canonicalServiceType === 'initial') selectedRange = quoteResult.ranges.initial;
                        else if (canonicalServiceType === 'general') selectedRange = quoteResult.ranges.general;
                        else if (canonicalServiceType === 'move-in') selectedRange = quoteResult.ranges.moveInOutBasic;
                        else if (canonicalServiceType === 'move-out') selectedRange = quoteResult.ranges.moveInOutFull;
                        else if (canonicalServiceType === 'deep') selectedRange = quoteResult.ranges.deep;
                        if (!selectedRange) {
                          console.warn('[Quote] Price could not be determined: no matching column for serviceType/frequency', {
                            rawServiceType: quoteResult.serviceType,
                            rawFrequency: quoteResult.frequency,
                            canonicalServiceType,
                            effectiveFrequency,
                            selectedServiceKey,
                            serviceTypeLabel: quoteResult.serviceTypeLabel,
                          });
                        }

                        // When range came from selectedServiceKey (e.g. move-out from label), show label for that key so name matches price
                        const selectedServiceName = (selectedServiceKey && getRangeForServiceKey(selectedServiceKey) && ['move-in', 'move-out', 'deep', 'initial', 'general'].includes(selectedServiceKey))
                          ? (quoteResult.serviceTypeLabel || getServiceLabel(selectedServiceKey))
                          : (['move-in', 'move-out', 'deep'].includes(canonicalServiceType)
                            ? (quoteResult.serviceTypeLabel || getServiceLabel(canonicalServiceType))
                            : (isRecurringService ? (quoteResult.frequencyLabel || getFreqLabel(frequency)) : (quoteResult.serviceTypeLabel || getServiceLabel(serviceType))));
                        const isOneTimeService = ['move-in', 'move-out', 'deep'].includes(canonicalServiceType);
                        // When they picked initial/general clean + a frequency, show BOTH in the green box
                        const isInitialPlusFrequency = (canonicalServiceType === 'general' || canonicalServiceType === 'initial') && hasRecurringFrequency;
                        const initialCleanRange = canonicalServiceType === 'initial' ? quoteResult.ranges?.initial : quoteResult.ranges?.general;
                        const initialCleanLabel = quoteResult.serviceTypeLabel || getServiceLabel(canonicalServiceType);

                        return (
                          <>
                            {/* YOUR SELECTED SERVICE - Green Background */}
                            {(
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
                                <div className="ml-8 space-y-2">
                                  {selectedRange ? (
                                    isInitialPlusFrequency && initialCleanRange ? (
                                      <>
                                        <p className="font-bold text-lg text-gray-900">
                                          {initialCleanLabel}: <span className="text-gray-700">${initialCleanRange.low} to ${initialCleanRange.high}</span>
                                        </p>
                                        <p className="font-bold text-lg text-gray-900">
                                          Your Selected Frequency: {quoteResult.frequencyLabel || getFreqLabel(frequency)}: <span className="text-gray-700">${selectedRange.low} to ${selectedRange.high}</span>
                                        </p>
                                      </>
                                    ) : (
                                      <p className="font-bold text-lg text-gray-900">
                                        {selectedServiceName}: <span className="text-gray-700">${selectedRange.low} to ${selectedRange.high}</span>
                                      </p>
                                    )
                                  ) : (
                                    <p className="font-bold text-lg text-amber-800">
                                      Price could not be determined for this selection.
                                      {quoteResult.locationContact?.contactEmail || quoteResult.locationContact?.contactPhone ? (
                                        <> Please <a href={quoteResult.locationContact.contactEmail ? `mailto:${quoteResult.locationContact.contactEmail}` : `tel:${quoteResult.locationContact.contactPhone!.replace(/\s/g, '')}`} className="underline hover:opacity-80">contact us</a> for a quote.</>
                                      ) : (
                                        ' Please contact us for a quote.'
                                      )}
                                    </p>
                                  )}
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

                            {/* INITIAL CLEANING - Show as recommendation only when calendar is closed */}
                            {!showAppointmentForm && !showCallForm && quoteResult.initialCleaningRecommended && !quoteResult.initialCleaningRequired && isRecurringService && quoteResult.ranges?.general && (
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

                            {/* Most Popular recurring option - only when calendar is closed */}
                            {!showAppointmentForm && !showCallForm && frequency !== 'bi-weekly' && quoteResult.ranges?.biWeekly && (
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

                            {/* OTHER SERVICE OPTIONS - only when calendar is closed */}
                            {!showAppointmentForm && !showCallForm && quoteResult.ranges && (
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

                      {/* Calendar inline under You Selected Service - same section, no scroll */}
                      {(showAppointmentForm || showCallForm) && quoteResult?.ghlContactId && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-6"
                        >
                          {showAppointmentForm ? (
                            appointmentReview ? (
                              <div ref={calendarRef} className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
                                <div className="p-4 border-b bg-gray-50">
                                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Calendar className="h-5 w-5" style={{ color: primaryColor }} />
                                    Review & confirm
                                  </h3>
                                  <p className="text-gray-600 text-sm mt-1">Confirm your appointment and add payment information for your service (no charge now)</p>
                                </div>
                                <div className="p-4 space-y-4">
                                  {bookingMessage && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className={`p-3 rounded-lg text-sm ${
                                        bookingMessage.type === 'success'
                                          ? 'bg-green-50 text-green-800 border border-green-200'
                                          : 'bg-red-50 text-red-800 border border-red-200'
                                      }`}
                                    >
                                      {bookingMessage.text}
                                    </motion.div>
                                  )}
                                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                                    <p className="text-sm font-semibold text-gray-800">Appointment</p>
                                    <p className="text-gray-700 mt-1">
                                      {new Date(appointmentReview.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                      {' at '}
                                      {(() => {
                                        const [h, m] = appointmentReview.time.split(':');
                                        const d = new Date();
                                        d.setHours(parseInt(h, 10), parseInt(m, 10));
                                        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                                      })()}
                                    </p>
                                    {appointmentReview.notes?.trim() && (
                                      <p className="text-sm text-gray-600 mt-1">Notes: {appointmentReview.notes}</p>
                                    )}
                                  </div>
                                  <PreauthCardForm
                                    primaryColor={primaryColor}
                                    isSubmitting={isBookingAppointment}
                                    onSubmit={(preauthCardInfo) => {
                                      handleBookAppointment(
                                        appointmentReview.date,
                                        appointmentReview.time,
                                        appointmentReview.notes,
                                        appointmentReview.timestamp,
                                        preauthCardInfo
                                      );
                                    }}
                                    onSkip={() => {
                                      handleBookAppointment(
                                        appointmentReview.date,
                                        appointmentReview.time,
                                        appointmentReview.notes,
                                        appointmentReview.timestamp
                                      );
                                    }}
                                  />
                                  <div className="flex justify-end pt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setAppointmentReview(null);
                                      }}
                                      disabled={isBookingAppointment}
                                    >
                                      Change date or time
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div ref={calendarRef} className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
                                <div className="p-4 border-b bg-gray-50">
                                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Calendar className="h-5 w-5" style={{ color: primaryColor }} />
                                    Schedule Your Appointment
                                  </h3>
                                  <p className="text-gray-600 text-sm mt-1">Choose a date and time that works for you</p>
                                </div>
                                <div className="p-4">
                                  {bookingMessage && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className={`mb-4 p-3 rounded-lg text-sm ${
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
                                    toolSlug={(slug && toolSlug) ? toolSlug : slug}
                                    onConfirm={(date, time, notes, timestamp) => {
                                      setAppointmentDate(date);
                                      setAppointmentTime(time);
                                      setAppointmentNotes(notes);
                                      setAppointmentReview({ date, time, notes, timestamp: timestamp ?? undefined });
                                    }}
                                    onCancel={() => {
                                      setShowAppointmentForm(false);
                                      setBookingMessage(null);
                                      setAppointmentDate('');
                                      setAppointmentTime('');
                                      setAppointmentReview(null);
                                    }}
                                    isBooking={isBookingAppointment}
                                    primaryColor={primaryColor}
                                  />
                                </div>
                              </div>
                            )
                          ) : showCallForm ? (
                            <div ref={calendarRef} className="rounded-xl border-2 border-gray-200 bg-white overflow-hidden">
                              <div className="p-4 border-b bg-gray-50">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                  <Clock className="h-5 w-5" style={{ color: primaryColor }} />
                                  Schedule a Callback
                                </h3>
                                <p className="text-gray-600 text-sm mt-1">We'll call you at your preferred time</p>
                              </div>
                              <div className="p-4">
                                {callMessage && (
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`mb-4 p-3 rounded-lg text-sm ${
                                      callMessage.type === 'success'
                                        ? 'bg-green-50 text-green-800 border border-green-200'
                                        : 'bg-red-50 text-red-800 border border-red-200'
                                    }`}
                                  >
                                    {callMessage.text}
                                  </motion.div>
                                )}
                                <CalendarBooking
                                  type="call"
                                  toolSlug={(slug && toolSlug) ? toolSlug : slug}
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
                            </div>
                          ) : null}
                        </motion.div>
                      )}

                      {/* Action Buttons: two CTAs when calendar closed; Back when calendar open */}
                      {quoteResult && !isLoading && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="pt-4"
                        >
                          {appointmentConfirmed || callConfirmed ? (
                            <div className="w-full p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                              <p className="text-green-800 text-sm font-semibold">
                                {appointmentConfirmed ? '✅ Appointment confirmed!' : '✅ Callback scheduled!'}
                              </p>
                            </div>
                          ) : showAppointmentForm || showCallForm ? (
                            <div className="flex justify-center">
                              <Button
                                onClick={() => {
                                  setShowAppointmentForm(false);
                                  setShowCallForm(false);
                                  setBookingMessage(null);
                                  setCallMessage(null);
                                }}
                                variant="outline"
                                className="gap-2 border-2 hover:bg-gray-100"
                                style={{ borderColor: primaryColor, color: primaryColor }}
                              >
                                <ChevronLeft className="h-5 w-5" />
                                Back to summary
                              </Button>
                            </div>
                          ) : (
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
                          )}
                        </motion.div>
                      )}

                      {/* Get Another Quote Link */}
                      <div className="pt-4 text-center">
                        <button
                          onClick={() => {
                            const p = new URLSearchParams(getPassthroughParams());
                            if (quoteResult?.ghlContactId) p.set('contactId', quoteResult.ghlContactId);
                            p.set('startAt', 'address');
                            router.push(`${quoteStartPath}?${p.toString()}`);
                          }}
                          className="text-sm font-medium primary-text hover:opacity-80 transition-opacity inline-flex items-center gap-1"
                          style={{ color: primaryColor }}
                        >
                          <span>⮑</span>
                          <span>Get Another Quote</span>
                        </button>
                      </div>

                      {/* Footer: business contact info from GHL (always up to date) */}
                      {quoteResult.locationContact && (quoteResult.locationContact.orgName || quoteResult.locationContact.contactEmail || quoteResult.locationContact.contactPhone || quoteResult.locationContact.officeAddress) && (
                        <div className="mt-6 pt-5 border-t border-gray-200">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {quoteResult.locationContact.orgName || 'Contact us'}
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            {quoteResult.locationContact.contactPhone && (
                              <a href={`tel:${quoteResult.locationContact.contactPhone.replace(/\s/g, '')}`} className="hover:underline">
                                {quoteResult.locationContact.contactPhone}
                              </a>
                            )}
                            {quoteResult.locationContact.contactEmail && (
                              <a href={`mailto:${quoteResult.locationContact.contactEmail}`} className="hover:underline">
                                {quoteResult.locationContact.contactEmail}
                              </a>
                            )}
                            {quoteResult.locationContact.officeAddress && (
                              <span className="block sm:inline">{quoteResult.locationContact.officeAddress}</span>
                            )}
                          </div>
                        </div>
                      )}

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

              {/* Calendar and call form now shown inline in quote card above */}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
