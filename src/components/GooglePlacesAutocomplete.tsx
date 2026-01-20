'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

interface GooglePlacesAutocompleteProps {
  id: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  primaryColor?: string;
  value?: string;
  onChange?: (value: string, placeDetails?: PlaceDetails) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export interface PlaceDetails {
  lat: number;
  lng: number;
  formattedAddress: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function GooglePlacesAutocomplete({
  id,
  label,
  placeholder,
  required = false,
  primaryColor = '#f61590',
  value,
  onChange,
  onKeyDown,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple address collection without complex Google Places APIs
  // We'll just collect the address and provide basic geocoding on blur
  useEffect(() => {
    const checkApiLoaded = () => {
      if (window.google?.maps?.Geocoder) {
        setIsLoaded(true);
      }
    };

    // Check immediately
    checkApiLoaded();

    // If not loaded, wait for it
    if (!isLoaded && inputRef.current) {
      const checkInterval = setInterval(() => {
        checkApiLoaded();
      }, 100);

      return () => clearInterval(checkInterval);
    }
  }, [isLoaded]);

  const handleBlur = async () => {
    if (!inputRef.current?.value) return;

    try {
      if (!window.google?.maps?.Geocoder) {
        console.warn('Google Maps Geocoder not available');
        return;
      }

      const geocoder = new window.google.maps.Geocoder();

      // Try to geocode the address to get coordinates
      geocoder.geocode(
        { address: inputRef.current.value, componentRestrictions: { country: 'us' } },
        (results: any[], status: string) => {
          if (status === 'OK' && results?.[0]) {
            const place = results[0];
            const placeDetails: PlaceDetails = {
              lat: place.geometry?.location?.lat?.() || 0,
              lng: place.geometry?.location?.lng?.() || 0,
              formattedAddress: place.formatted_address || inputRef.current?.value || '',
            };

            if (onChange) {
              onChange(placeDetails.formattedAddress, placeDetails);
            }
            setError(null);
          } else if (status !== 'ZERO_RESULTS') {
            console.warn('Geocoding error:', status);
          }
        }
      );
    } catch (err) {
      console.error('Error during geocoding:', err);
      // Still allow the user to submit with just the text address
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="text-2xl font-semibold text-gray-900 block">
          {label}
          {required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder || 'Enter your address'}
          className="h-14 text-lg"
          value={value || ''}
          onChange={(e) => {
            if (onChange) {
              onChange(e.target.value);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-3 top-4 text-xs text-gray-400"
          >
            Loading maps...
          </motion.div>
        )}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-amber-600"
        >
          ⚠️ {error}
        </motion.p>
      )}
    </div>
  );
}
