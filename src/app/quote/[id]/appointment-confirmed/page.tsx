'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Calendar, Loader2 } from 'lucide-react';

export default function AppointmentConfirmedPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = params.id as string;
  const [redirectAfterAppointment, setRedirectAfterAppointment] = useState<boolean>(false);
  const [appointmentRedirectUrl, setAppointmentRedirectUrl] = useState<string>('');
  const [isLoadingAnotherQuote, setIsLoadingAnotherQuote] = useState(false);

  // Preserve UTM parameters for tracking
  const utmParams = new URLSearchParams();
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
    const value = searchParams.get(param);
    if (value) utmParams.set(param, value);
  });

  // Load redirect settings
  useEffect(() => {
    const loadRedirectSettings = async () => {
      try {
        const response = await fetch('/api/admin/ghl-config');
        if (response.ok) {
          const data = await response.json();
          const config = data.config;
          if (config) {
            setRedirectAfterAppointment(config.redirectAfterAppointment === true);
            setAppointmentRedirectUrl(config.appointmentRedirectUrl || '');
          }
        }
      } catch (error) {
        console.error('Failed to load redirect settings:', error);
      }
    };

    loadRedirectSettings();
  }, []);

  // Fire tracking events on page load
  useEffect(() => {
    // Google Analytics - Appointment Confirmed Event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'appointment_confirmed', {
        quote_id: quoteId,
        event_category: 'Booking',
        event_label: 'Appointment Booked',
      });

      // Track pageview with confirmation URL
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: `/quote/${quoteId}/appointment-confirmed`,
        page_title: 'Appointment Confirmed',
      });
    }

    // Meta Pixel - Appointment Confirmed
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Schedule', {
        content_name: 'Appointment Confirmed',
        quote_id: quoteId,
      });
    }

    // Google Ads - Appointment Conversion
    const googleAdsConversionId = searchParams.get('gclid');
    if (googleAdsConversionId && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        'send_to': googleAdsConversionId,
        'event_category': 'Booking',
        'event_label': 'Appointment Confirmed',
      });
    }
  }, [quoteId, searchParams]);

  // Handle redirect after 5 seconds if enabled
  useEffect(() => {
    if (redirectAfterAppointment && appointmentRedirectUrl) {
      const redirectTimer = setTimeout(() => {
        window.location.href = appointmentRedirectUrl;
      }, 5000); // 5 seconds delay as per setting description

      return () => clearTimeout(redirectTimer);
    }
  }, [redirectAfterAppointment, appointmentRedirectUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md w-full"
      >
        <Card className="shadow-2xl border-0">
          <CardContent className="pt-12 pb-10 px-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mb-6"
            >
              <CheckCircle className="h-20 w-20 text-green-500 mx-auto" />
            </motion.div>

            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Appointment Confirmed!
            </h1>

            <p className="text-gray-600 mb-8">
              Your cleaning appointment has been successfully scheduled. We'll send you a confirmation email shortly.
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => router.push(`/quote/${quoteId}${utmParams.toString() ? `?${utmParams.toString()}` : ''}`)}
                variant="outline"
                className="w-full"
              >
                <Calendar className="h-4 w-4 mr-2" />
                View Quote Details
              </Button>

              <Button
                onClick={async () => {
                  setIsLoadingAnotherQuote(true);
                  try {
                    const res = await fetch(`/api/quote/${quoteId}`);
                    const data = await res.json();
                    const p = new URLSearchParams(utmParams);
                    p.set('startAt', 'address');
                    if (data?.ghlContactId) p.set('contactId', data.ghlContactId);
                    router.push(`/?${p.toString()}`);
                  } catch {
                    const p = new URLSearchParams(utmParams);
                    p.set('startAt', 'address');
                    router.push(`/?${p.toString()}`);
                  } finally {
                    setIsLoadingAnotherQuote(false);
                  }
                }}
                variant="ghost"
                className="w-full"
                disabled={isLoadingAnotherQuote}
              >
                {isLoadingAnotherQuote ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Get Another Quote'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
