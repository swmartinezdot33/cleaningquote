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
  const autocompleteRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Google Places Autocomplete using the new PlacesService
  useEffect(() => {
    const initAutocomplete = () => {
      if (!window.google) {
        console.warn('Google Maps API not loaded');
        setError('Google Maps API is not available');
        return;
      }

      if (inputRef.current && !autocompleteRef.current) {
        try {
          // Try to use the new PlaceAutocompleteElement if available (Maps JS v3.54+)
          // Fall back to the older Autocomplete API if not available
          if (window.google.maps.places?.PlacesService) {
            // Use traditional Autocomplete with the places service
            const autocomplete = new window.google.maps.places.AutocompleteService();
            const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
            
            autocompleteRef.current = { autocomplete, placesService };
            
            // Setup input listener for autocomplete suggestions
            let predictions: any[] = [];
            inputRef.current.addEventListener('input', async (e: Event) => {
              const input = e.target as HTMLInputElement;
              if (input.value.length > 2) {
                try {
                  const result = await autocomplete.getPlacePredictions({
                    input: input.value,
                    componentRestrictions: { country: 'us' },
                    types: ['geocode'],
                  });
                  predictions = result.predictions || [];
                } catch (err) {
                  console.warn('Autocomplete prediction error:', err);
                }
              }
            });

            inputRef.current.addEventListener('blur', () => {
              // On blur, try to get place details if there's text
              if (inputRef.current?.value) {
                attemptGetPlaceDetails(inputRef.current.value, placesService);
              }
            });

            setIsLoaded(true);
          } else {
            // Fallback to old Autocomplete API
            const autocomplete = new window.google.maps.places.Autocomplete(
              inputRef.current,
              {
                types: ['geocode'],
                componentRestrictions: { country: 'us' },
                fields: ['formatted_address', 'geometry'],
              }
            );

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
          }
        } catch (err) {
          console.error('Error initializing Google Places:', err);
          setError('Failed to initialize address suggestions');
        }
      }
    };

    const attemptGetPlaceDetails = (address: string, placesService: any) => {
      try {
        placesService.findPlaceFromQuery(
          { query: address, fields: ['formatted_address', 'geometry', 'name'] },
          (results: any[], status: string) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
              const place = results[0];
              const placeDetails: PlaceDetails = {
                lat: place.geometry?.location?.lat?.() || 0,
                lng: place.geometry?.location?.lng?.() || 0,
                formattedAddress: place.formatted_address || address,
              };
              if (onChange) {
                onChange(placeDetails.formattedAddress, placeDetails);
              }
              setError(null);
            }
          }
        );
      } catch (err) {
        console.warn('Could not get place details:', err);
      }
    };

    // Check if Google Maps API is loaded immediately
    if (window.google) {
      initAutocomplete();
    } else {
      // Wait for Google Maps API to load
      const checkInterval = setInterval(() => {
        if (window.google && inputRef.current) {
          initAutocomplete();
          clearInterval(checkInterval);
        }
      }, 100);

      return () => clearInterval(checkInterval);
    }

    return () => {
      if (autocompleteRef.current) {
        if (autocompleteRef.current.autocomplete) {
          // New API - cleanup
          if (window.google?.maps?.event?.clearInstanceListeners) {
            window.google.maps.event.clearInstanceListeners(autocompleteRef.current.autocomplete);
          }
        } else if (window.google?.maps?.event?.clearInstanceListeners) {
          // Old API - cleanup
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      }
    };
  }, [onChange]);

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
