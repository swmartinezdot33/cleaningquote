'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface LocationData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

export default function OutOfService() {
  const [mounted, setMounted] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#7c3aed');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadWidgetSettings();

    // Try to get location data and contact ID from URL params
    const params = new URLSearchParams(window.location.search);
    const dataStr = params.get('data');
    const cId = params.get('contactId');
    
    if (cId) {
      setContactId(cId);
    }
    
    if (dataStr) {
      try {
        const data = JSON.parse(decodeURIComponent(dataStr));
        setLocationData(data);
      } catch {
        // Silently ignore parsing errors
      }
    }
  }, []);

  const loadWidgetSettings = async () => {
    try {
      const response = await fetch('/api/admin/widget-settings');
      if (response.ok) {
        const data = await response.json();
        setPrimaryColor(data.primaryColor || '#7c3aed');
      }
    } catch (error) {
      console.error('Failed to load widget settings:', error);
    }
  };

  const hexToRgba = (hex: string, alpha: number = 1) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getStartQuoteUrl = () => {
    const params = new URLSearchParams();
    params.set('startAt', 'address');
    if (contactId) {
      params.set('contactId', contactId);
      params.set('fromOutOfService', 'true');
    }
    return `/?${params.toString()}`;
  };

  if (!mounted) {
    return null;
  }

  return (
    <main
      className="min-h-screen bg-gradient-to-br via-white pt-12 pb-20 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: `linear-gradient(135deg, ${hexToRgba(primaryColor, 0.05)} 0%, transparent 50%, ${hexToRgba(primaryColor, 0.05)} 100%)`,
      }}
    >
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          {/* Out of Service Card */}
          <Card className="shadow-2xl border-0 overflow-hidden">
            <div
              className="p-8 text-white"
              style={{
                background: `linear-gradient(to right, ${primaryColor}, ${hexToRgba(primaryColor, 0.8)})`,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-4xl font-bold">Service Area Check</h1>
                <AlertCircle className="h-10 w-10 opacity-80" />
              </div>
              <p className="text-lg opacity-90">
                We're currently serving limited areas
              </p>
            </div>

            <CardContent className="pt-12">
              <div className="text-center space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <div
                    className="w-24 h-24 rounded-full mx-auto flex items-center justify-center"
                    style={{
                      backgroundColor: `${hexToRgba(primaryColor, 0.1)}`,
                      borderColor: `${hexToRgba(primaryColor, 0.3)}`,
                    }}
                  >
                    <AlertCircle
                      className="h-12 w-12"
                      style={{ color: primaryColor }}
                    />
                  </div>
                </motion.div>

                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Outside Service Area
                  </h2>
                  <p className="text-lg text-gray-700 mb-2">
                    We're sorry, but the address you provided is outside our
                    current service area.
                  </p>
                  <p className="text-gray-600">
                    We're constantly expanding. Please check back soon, or contact us if you'd
                    like to discuss your cleaning needs.
                  </p>
                </div>

                {locationData && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-8 p-6 rounded-lg border-2"
                    style={{
                      borderColor: `${hexToRgba(primaryColor, 0.3)}`,
                      backgroundColor: `${hexToRgba(primaryColor, 0.05)}`,
                    }}
                  >
                    <h3 className="font-semibold text-gray-900 mb-3">
                      Your Information
                    </h3>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>
                        <strong>Name:</strong> {locationData.firstName}{' '}
                        {locationData.lastName}
                      </p>
                      <p>
                        <strong>Email:</strong> {locationData.email}
                      </p>
                      <p>
                        <strong>Phone:</strong> {locationData.phone}
                      </p>
                      {locationData.address && (
                        <p>
                          <strong>Address:</strong> {locationData.address}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex flex-col gap-3 mt-10">
                <Link href={getStartQuoteUrl()} className="w-full">
                  <Button className="w-full h-12 text-base font-bold" size="lg">
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Start New Quote
                  </Button>
                </Link>

                <a
                  href="mailto:hello@raleighcleaningcompany.com"
                  className="w-full"
                >
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-bold"
                    size="lg"
                  >
                    Contact Us
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-muted-foreground text-sm">
            <p className="mb-1">Get in touch</p>
            <p>
              <a href="tel:9199252378" className="underline" style={{ color: primaryColor }}>Phone: 919.925.2378</a>
              {' · '}
              <a href="mailto:hello@raleighcleaningcompany.com" className="underline" style={{ color: primaryColor }}>Email: hello@raleighcleaningcompany.com</a>
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
