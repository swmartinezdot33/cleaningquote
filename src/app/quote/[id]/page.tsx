'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  const quoteId = params.id as string;
  
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [widgetTitle, setWidgetTitle] = useState('Raleigh Cleaning Company');
  const [primaryColor, setPrimaryColor] = useState('#f61590');
  const [googleAdsConversionId, setGoogleAdsConversionId] = useState('');
  const [googleAdsConversionLabel, setGoogleAdsConversionLabel] = useState('');
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

  // Load widget settings and tracking codes in parallel
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load widget settings and tracking codes in parallel for faster load
        const [widgetResponse, trackingResponse] = await Promise.all([
          fetch('/api/admin/widget-settings'),
          fetch('/api/admin/tracking-codes'),
        ]);

        if (widgetResponse.ok) {
          const widgetData = await widgetResponse.json();
          setWidgetTitle(widgetData.title || 'Raleigh Cleaning Company');
          setPrimaryColor(widgetData.primaryColor || '#f61590');
        }

        if (trackingResponse.ok) {
          const trackingData = await trackingResponse.json();
          if (trackingData.trackingCodes) {
            setGoogleAdsConversionId(trackingData.trackingCodes.googleAdsConversionId || '');
            setGoogleAdsConversionLabel(trackingData.trackingCodes.googleAdsConversionLabel || '');
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    loadSettings();
  }, []);

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

  // Fire tracking events on page load
  useEffect(() => {
    if (!isLoading && quoteResult && !quoteResult.outOfLimits) {
      // Google Analytics - pageview or custom event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'quote_completed', {
          quote_id: quoteId,
          service_type: quoteResult.serviceType || 'unknown',
          frequency: quoteResult.frequency || 'unknown',
        });
      }

      // Google Ads conversion
      if (googleAdsConversionId) {
        try {
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'conversion', {
              'allow_custom_scripts': true,
              'send_to': googleAdsConversionId,
              ...(googleAdsConversionLabel && { 'conversion_label': googleAdsConversionLabel }),
            });
          }
        } catch (error) {
          console.error('Error triggering Google Ads conversion:', error);
        }
      }

      // Meta Pixel
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead', {
          content_name: 'Quote Completed',
          quote_id: quoteId,
        });
      }
    }
  }, [isLoading, quoteResult, quoteId, googleAdsConversionId, googleAdsConversionLabel]);

  // Auto-scroll to calendar when appointment form opens
  useEffect(() => {
    if (showAppointmentForm && calendarRef.current) {
      setTimeout(() => {
        calendarRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest',
        });
        window.scrollBy({ top: -20, behavior: 'smooth' });
      }, 200);
    }
  }, [showAppointmentForm]);

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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setAppointmentConfirmed(true);
        setBookingMessage({
          type: 'success',
          text: 'Appointment booked successfully!',
        });
        setShowAppointmentForm(false);
      } else {
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
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCallConfirmed(true);
        setCallMessage({
          type: 'success',
          text: 'Call scheduled successfully!',
        });
        setShowCallForm(false);
      } else {
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
              <Button onClick={() => router.push('/')}>Start New Quote</Button>
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
              <Button onClick={() => router.push('/')}>Start New Quote</Button>
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
                              <span className="font-medium">Rooms:</span>{' '}
                              <span className="text-gray-900">{quoteResult.inputs.bedrooms || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium">Full Baths:</span>{' '}
                              <span className="text-gray-900">{quoteResult.inputs.fullBaths || 0}</span>
                            </div>
                            <div>
                              <span className="font-medium">Half Baths:</span>{' '}
                              <span className="text-gray-900">{quoteResult.inputs.halfBaths || 0}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* YOUR SELECTED SERVICE - Green Background */}
                      {quoteResult.ranges && (() => {
                        const serviceType = quoteResult.serviceType || '';
                        const frequency = quoteResult.frequency || '';
                        
                        // Determine selected service and price range
                        // Priority: frequency-based services first, then one-time services
                        let selectedServiceName = '';
                        let selectedRange: { low: number; high: number } | null = null;
                        
                        // Check for recurring services first
                        if (frequency === 'weekly') {
                          selectedServiceName = 'Weekly Cleaning';
                          selectedRange = quoteResult.ranges.weekly;
                        } else if (frequency === 'bi-weekly') {
                          selectedServiceName = 'Bi-Weekly Cleaning';
                          selectedRange = quoteResult.ranges.biWeekly;
                        } else if (frequency === 'four-week' || frequency === 'monthly') {
                          selectedServiceName = 'Every 4 Weeks Cleaning';
                          selectedRange = quoteResult.ranges.fourWeek;
                        } 
                        // Then check for one-time services
                        else if (serviceType === 'general') {
                          selectedServiceName = 'General Clean';
                          selectedRange = quoteResult.ranges.general;
                        } else if (serviceType === 'deep') {
                          selectedServiceName = 'Deep Clean';
                          selectedRange = quoteResult.ranges.deep;
                        } else if (serviceType === 'move-in') {
                          selectedServiceName = 'Move-In Clean';
                          selectedRange = quoteResult.ranges.moveInOutBasic;
                        } else if (serviceType === 'move-out') {
                          selectedServiceName = 'Move-Out Clean';
                          selectedRange = quoteResult.ranges.moveInOutFull;
                        } else {
                          // Default to general if nothing matches
                          selectedServiceName = 'General Clean';
                          selectedRange = quoteResult.ranges.general;
                        }

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

                            {/* OTHER ONE-TIME OPTIONS - Only show if selected service is NOT one-time */}
                            {(!serviceType || !['general', 'deep', 'move-in', 'move-out'].includes(serviceType) || frequency) && (
                              <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.15 }}
                                className="space-y-2"
                              >
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">OTHER ONE-TIME OPTIONS:</p>
                                
                                {/* Deep Clean - Only show if not selected */}
                                {selectedServiceName !== 'Deep Clean' && (
                                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                                      <span className="text-gray-400 text-xs">✓</span>
                                    </div>
                                    <span className="text-sm text-gray-400 mr-2">🧹</span>
                                    <div className="flex-1">
                                      <span className="font-semibold text-gray-900">Deep Clean:</span>{' '}
                                      <span className="text-gray-700">${quoteResult.ranges.deep.low} to ${quoteResult.ranges.deep.high}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* General Clean - Only show if not selected */}
                                {selectedServiceName !== 'General Clean' && (
                                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center">
                                      <span className="text-gray-400 text-xs">✓</span>
                                    </div>
                                    <span className="text-sm text-gray-400 mr-2">✨</span>
                                    <div className="flex-1">
                                      <span className="font-semibold text-gray-900">General Clean:</span>{' '}
                                      <span className="text-gray-700">${quoteResult.ranges.general.low} to ${quoteResult.ranges.general.high}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Move-In Clean - Only show if not selected */}
                                {selectedServiceName !== 'Move-In Clean' && (
                                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg flex items-center gap-3">
                                    <span className="text-sm text-gray-400">🧹</span>
                                    <div className="flex-1">
                                      <span className="font-semibold text-gray-900">Move-In Clean:</span>{' '}
                                      <span className="text-gray-700">${quoteResult.ranges.moveInOutBasic.low} to ${quoteResult.ranges.moveInOutBasic.high}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Move-Out Clean - Only show if not selected */}
                                {selectedServiceName !== 'Move-Out Clean' && (
                                  <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg flex items-center gap-3">
                                    <span className="text-sm text-gray-400">🧹</span>
                                    <div className="flex-1">
                                      <span className="font-semibold text-gray-900">Move-Out Clean:</span>{' '}
                                      <span className="text-gray-700">${quoteResult.ranges.moveInOutFull.low} to ${quoteResult.ranges.moveInOutFull.high}</span>
                                    </div>
                                  </div>
                                )}
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
                          onClick={() => router.push('/')}
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
