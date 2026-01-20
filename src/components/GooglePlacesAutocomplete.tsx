'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';

interface GooglePlacesAutocompleteProps {
  id: string;
  label: string;
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
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    if (!window.google) {
      console.warn('Google Maps API not loaded');
      setError('Google Maps API is not available');
      return;
    }

    if (inputRef.current && !autocompleteRef.current) {
      try {
        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['geocode'],
            componentRestrictions: { country: 'us' }, // Restrict to US
            fields: ['formatted_address', 'geometry'],
          }
        );

        // Handle place selection
        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();

          if (!place.geometry) {
            console.warn('No geometry data for place');
            return;
          }

          const placeDetails: PlaceDetails = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            formattedAddress: place.formatted_address || inputRef.current?.value || '',
          };

          if (onChange) {
            onChange(placeDetails.formattedAddress, placeDetails);
          }

          setError(null);
        });

        autocompleteRef.current = autocomplete;
        setIsLoaded(true);
      } catch (err) {
        console.error('Error initializing Google Places Autocomplete:', err);
        setError('Failed to initialize address suggestions');
      }
    }

    return () => {
      if (autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-2xl font-semibold text-gray-900 block">
        {label}
        {required && <span className="ml-1" style={{ color: primaryColor }}>*</span>}
      </Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          placeholder={placeholder || 'Start typing your address...'}
          className="h-14 text-lg"
          value={value || ''}
          onChange={(e) => {
            if (onChange) {
              onChange(e.target.value);
            }
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-3 top-4 text-xs text-gray-400"
          >
            Loading suggestions...
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
