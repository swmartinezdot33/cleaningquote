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

interface OrgContact {
  orgName: string;
  contactEmail: string | null;
  contactPhone: string | null;
}

export default function OutOfService() {
  const [mounted, setMounted] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('transparent');
  const [orgContact, setOrgContact] = useState<OrgContact | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    loadWidgetSettings();

    // Try to get location data, contact ID, and return path from URL params
    const params = new URLSearchParams(window.location.search);
    const dataStr = params.get('data');
    const cId = params.get('contactId');
    const path = params.get('returnPath');
    if (path && path.startsWith('/')) {
      setReturnPath(path.replace(/\/+$/, '') || '/');
    }
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
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
      // Support both toolId and toolld (typo resilience)
      const toolIdParam = params.get('toolId') ?? params.get('toolld');
      const slugParam = params.get('slug');
      const url =
        toolIdParam
          ? `/api/tools/by-id/config?toolId=${encodeURIComponent(toolIdParam)}`
          : slugParam
            ? `/api/tools/${encodeURIComponent(slugParam)}/config`
            : '/api/admin/widget-settings';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const widget = data.widget ?? data;
        const color = widget?.primaryColor || data.primaryColor || '#7c3aed';
        setPrimaryColor(color);
      } else {
        setPrimaryColor('#7c3aed');
      }
      // Load org contact for Contact Us and Get in touch (by toolId or slug)
      if (toolIdParam) {
        const contactRes = await fetch(`/api/tools/by-id/org-contact?toolId=${encodeURIComponent(toolIdParam)}`);
        if (contactRes.ok) {
          const contactData = await contactRes.json();
          setOrgContact({
            orgName: contactData.orgName ?? '',
            contactEmail: contactData.contactEmail ?? null,
            contactPhone: contactData.contactPhone ?? null,
          });
        }
      } else if (slugParam) {
        const contactRes = await fetch(`/api/tools/${encodeURIComponent(slugParam)}/org-contact`);
        if (contactRes.ok) {
          const contactData = await contactRes.json();
          setOrgContact({
            orgName: contactData.orgName ?? '',
            contactEmail: contactData.contactEmail ?? null,
            contactPhone: contactData.contactPhone ?? null,
          });
        }
      }
    } catch (error) {
      console.error('Failed to load widget settings:', error);
      setPrimaryColor('#7c3aed');
    }
  };

  useEffect(() => {
    if (typeof document !== 'undefined' && primaryColor && primaryColor !== 'transparent' && /^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
      document.documentElement.style.setProperty('--primary-color', primaryColor);
    }
  }, [primaryColor]);

  const hexToRgba = (hex: string, alpha: number = 1) => {
    if (!hex || hex === 'transparent' || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return 'rgba(0,0,0,0)';
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
    const basePath = returnPath || '/';
    return `${basePath}?${params.toString()}`;
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
                  <Button 
                    className="w-full h-12 text-base font-bold" 
                    size="lg"
                    style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Start New Quote
                  </Button>
                </Link>

                <a
                  href={orgContact?.contactEmail ? `mailto:${orgContact.contactEmail}` : '#'}
                  className="w-full"
                  style={orgContact?.contactEmail ? undefined : { pointerEvents: 'none', opacity: 0.7 }}
                >
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base font-bold"
                    size="lg"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    Contact Us
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-muted-foreground text-sm">
            <p className="mb-1">{orgContact?.orgName ? `Get in touch — ${orgContact.orgName}` : 'Get in touch'}</p>
            <p>
              {orgContact?.contactPhone && (
                <>
                  <a href={`tel:${orgContact.contactPhone.replace(/\D/g, '')}`} className="underline" style={{ color: primaryColor }}>Phone: {orgContact.contactPhone}</a>
                  {orgContact.contactEmail && ' · '}
                </>
              )}
              {orgContact?.contactEmail && (
                <a href={`mailto:${orgContact.contactEmail}`} className="underline" style={{ color: primaryColor }}>Email: {orgContact.contactEmail}</a>
              )}
              {!orgContact?.contactPhone && !orgContact?.contactEmail && (
                <span>Set org name, contact email, and phone in Dashboard → Team → Organization details.</span>
              )}
            </p>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
