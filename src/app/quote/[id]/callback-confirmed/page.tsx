'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Phone, Loader2 } from 'lucide-react';

export default function CallbackConfirmedPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = params.id as string;

  // Preserve UTM parameters for tracking
  const utmParams = new URLSearchParams();
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
    const value = searchParams.get(param);
    if (value) utmParams.set(param, value);
  });

  // Fire tracking events on page load
  useEffect(() => {
    // Google Analytics - Callback Confirmed Event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'callback_confirmed', {
        quote_id: quoteId,
        event_category: 'Booking',
        event_label: 'Callback Scheduled',
      });

      // Track pageview with confirmation URL
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: `/quote/${quoteId}/callback-confirmed`,
        page_title: 'Callback Confirmed',
      });
    }

    // Meta Pixel - Callback Confirmed
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('track', 'Schedule', {
        content_name: 'Callback Confirmed',
        quote_id: quoteId,
      });
    }

    // Google Ads - Callback Conversion
    const googleAdsConversionId = searchParams.get('gclid');
    if (googleAdsConversionId && typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'conversion', {
        'send_to': googleAdsConversionId,
        'event_category': 'Booking',
        'event_label': 'Callback Confirmed',
      });
    }
  }, [quoteId, searchParams]);

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
              Callback Scheduled!
            </h1>

            <p className="text-gray-600 mb-8">
              We've scheduled a callback for you. Our team will call you soon to discuss your cleaning needs.
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => router.push(`/quote/${quoteId}${utmParams.toString() ? `?${utmParams.toString()}` : ''}`)}
                variant="outline"
                className="w-full"
              >
                <Phone className="h-4 w-4 mr-2" />
                View Quote Details
              </Button>

              <Button
                onClick={() => router.push(`/${utmParams.toString() ? `?${utmParams.toString()}` : ''}`)}
                variant="ghost"
                className="w-full"
              >
                Get Another Quote
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
