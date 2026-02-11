'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Phone } from 'lucide-react';
import { LoadingDots } from '@/components/ui/loading-dots';

export default function CallbackConfirmedPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = (params?.id as string) ?? '';
  const slug = typeof params?.slug === 'string' ? params.slug : undefined;
  const toolSlug = typeof params?.toolSlug === 'string' ? params.toolSlug : undefined;
  const [isLoadingAnotherQuote, setIsLoadingAnotherQuote] = useState(false);

  // Preserve UTM parameters for tracking
  const utmParams = new URLSearchParams();
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
    const value = searchParams?.get(param);
    if (value) utmParams.set(param, value);
  });

  // Org-scoped: /t/orgslug/toolslug/quote/id → use both segments
  const quotePath = (slug && toolSlug) ? `/t/${slug}/${toolSlug}/quote/${quoteId}` : slug ? `/t/${slug}/quote/${quoteId}` : `/quote/${quoteId}`;
  const startPath = (slug && toolSlug) ? `/t/${slug}/${toolSlug}` : slug ? `/t/${slug}` : '/';

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
                onClick={() => router.push(`${quotePath}${utmParams.toString() ? `?${utmParams.toString()}` : ''}`)}
                variant="outline"
                className="w-full"
              >
                <Phone className="h-4 w-4 mr-2" />
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
                    router.push(`${startPath}?${p.toString()}`);
                  } catch {
                    const p = new URLSearchParams(utmParams);
                    p.set('startAt', 'address');
                    router.push(`${startPath}?${p.toString()}`);
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
                    <LoadingDots size="sm" className="mr-2 text-current" />
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
