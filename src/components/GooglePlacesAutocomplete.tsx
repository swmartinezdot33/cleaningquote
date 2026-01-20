'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';

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
    initGooglePlaces?: () => void;
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
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    // Check if Google Maps is already loaded
    if (window.google?.maps?.places?.Autocomplete) {
      setGoogleLoaded(true);
      initializeAutocomplete();
      return;
    }

    // Wait for Google Maps to load
    const checkGoogle = setInterval(() => {
      if (window.google?.maps?.places?.Autocomplete) {
        setGoogleLoaded(true);
        initializeAutocomplete();
        clearInterval(checkGoogle);
      }
    }, 100);

    // Cleanup
    return () => {
      clearInterval(checkGoogle);
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current);
      }
    };
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places?.Autocomplete) return;

    // Create Autocomplete instance
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'geometry', 'place_id'],
      types: ['address'],
    });

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      
      if (place.geometry && place.formatted_address) {
        const lat = place.geometry.location?.lat();
        const lng = place.geometry.location?.lng();
        
        const placeDetails: PlaceDetails = {
          lat: lat || 0,
          lng: lng || 0,
          formattedAddress: place.formatted_address,
        };

        // Update input value
        if (inputRef.current) {
          inputRef.current.value = place.formatted_address;
        }

        // Call onChange with both address and place details
        if (onChange) {
          onChange(place.formatted_address, placeDetails);
        }

        // Clear loading state
        setIsLoadingGeo(false);
      }
    });
  };

  const handleInputChange = (e: React.Change<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Update form value as user types
    if (onChange) {
      onChange(inputValue);
    }
  };

  const handleBlur = () => {
    // Validate on blur if we have a value but no place was selected
    if (inputRef.current?.value && !isLoadingGeo) {
      // Trigger geocoding to validate the address
      geocodeAddress(inputRef.current.value);
    }
  };

  const geocodeAddress = (address: string) => {
    if (!address || !window.google?.maps?.Geocoder) return;

    setIsLoadingGeo(true);
    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode(
      { address, componentRestrictions: { country: 'us' } },
      (results: any[], status: string) => {
        setIsLoadingGeo(false);
        
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
            formattedAddress: place.formatted_address || address,
          };

          // Update input with formatted address
          if (inputRef.current) {
            inputRef.current.value = placeDetails.formattedAddress;
          }

          // Call onChange to update form state
          if (onChange) {
            onChange(placeDetails.formattedAddress, placeDetails);
          }
        }
      }
    );
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
          placeholder={placeholder || 'Enter your address (e.g., 123 Main St, Raleigh, NC)'}
          className="h-14 text-lg"
          value={value || ''}
          onChange={handleInputChange}
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
