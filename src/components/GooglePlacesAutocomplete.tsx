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
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleBlur = () => {
    if (!inputRef.current?.value) return;

    // Try to geocode the address if Google Maps is available
    if (window.google?.maps?.Geocoder) {
      setIsLoadingGeo(true);
      try {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { address: inputRef.current.value, componentRestrictions: { country: 'us' } },
          (results: any[], status: string) => {
            setIsLoadingGeo(false);
            console.log('Geocoding status:', status, 'Results:', results);
            
            if (status === 'OK' && results?.[0]) {
              const place = results[0];
              const lat = typeof place.geometry?.location?.lat === 'function' 
                ? place.geometry.location.lat() 
                : place.geometry?.location?.lat;
              const lng = typeof place.geometry?.location?.lng === 'function' 
                ? place.geometry.location.lng() 
                : place.geometry?.location?.lng;
              
              const placeDetails: PlaceDetails = {
                lat: lat || 0,
                lng: lng || 0,
                formattedAddress: place.formatted_address || inputRef.current?.value || '',
              };

              console.log('Place details:', placeDetails);
              if (onChange) {
                onChange(placeDetails.formattedAddress, placeDetails);
              }
            } else if (status !== 'ZERO_RESULTS') {
              console.warn('Geocoding error:', status);
            } else {
              console.log('No results found for address');
            }
          }
        );
      } catch (err) {
        setIsLoadingGeo(false);
        console.error('Geocoding error:', err);
      }
    } else {
      console.warn('Google Maps Geocoder not available:', {
        hasGoogle: !!window.google,
        hasMaps: !!window.google?.maps,
        hasGeocoder: !!window.google?.maps?.Geocoder
      });
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
          onChange={handleAddressChange}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          autoComplete="off"
          disabled={isLoadingGeo}
        />
        {isLoadingGeo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-3 top-4 text-xs text-gray-400"
          >
            Finding location...
          </motion.div>
        )}
      </div>
    </div>
  );
}
