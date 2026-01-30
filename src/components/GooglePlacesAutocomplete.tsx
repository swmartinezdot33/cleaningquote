'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
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

export interface GooglePlacesAutocompleteHandle {
  geocodeCurrentValue: () => Promise<PlaceDetails | null>;
}

declare global {
  interface Window {
    google?: any;
    initGooglePlaces?: () => void;
  }
}

export const GooglePlacesAutocomplete = forwardRef<GooglePlacesAutocompleteHandle, GooglePlacesAutocompleteProps>(function GooglePlacesAutocomplete({
  id,
  label,
  placeholder,
  required = false,
  primaryColor = '#0d9488',
  value,
  onChange,
  onKeyDown,
}, ref) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const placeSelectedRef = useRef(false); // Track if a place was just selected from autocomplete
  const userTypedInputRef = useRef<string>(''); // Track user's typed input to preserve street number
  const [isLoadingGeo, setIsLoadingGeo] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  /** Geocode address string and return PlaceDetails or null. Used when user clicks Next without selecting from autocomplete. */
  const geocodeToPlaceDetails = (address: string): Promise<PlaceDetails | null> => {
    return new Promise((resolve) => {
      if (!address?.trim() || !window.google?.maps?.Geocoder) {
        resolve(null);
        return;
      }
      setIsLoadingGeo(true);
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { address: address.trim(), componentRestrictions: { country: 'us' } },
        (results: any[], status: string) => {
          setIsLoadingGeo(false);
          if (status === 'OK' && results?.[0]) {
            const place = results[0];
            const lat = typeof place.geometry?.location?.lat === 'function' ? place.geometry.location.lat() : place.geometry?.location?.lat;
            const lng = typeof place.geometry?.location?.lng === 'function' ? place.geometry.location.lng() : place.geometry?.location?.lng;
            if (lat != null && lng != null && lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
              const fullAddress = buildAddressFromGeocodeResult(place, address);
              resolve({ lat, lng, formattedAddress: fullAddress });
              return;
            }
          }
          resolve(null);
        }
      );
    });
  };

  useImperativeHandle(ref, () => ({
    geocodeCurrentValue: (): Promise<PlaceDetails | null> => {
      const v = inputRef.current?.value?.trim();
      if (!v) return Promise.resolve(null);
      return geocodeToPlaceDetails(v);
    },
  }), []);

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

  // Update input value when value prop changes
  // Only update if it's different to avoid interfering with Google Places autocomplete
  useEffect(() => {
    if (inputRef.current && value !== undefined && inputRef.current.value !== value) {
      inputRef.current.value = value || '';
    }
  }, [value]);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places?.Autocomplete) return;

    // Create Autocomplete instance
    // Request address components to ensure we get street number
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'geometry', 'place_id', 'address_components', 'name'],
      types: ['address'],
    });

    // Helper function to build full address from components
    // Preserves street number from user's typed input if Google Places doesn't provide one
    const buildAddressFromComponents = (place: any, userInput?: string): string => {
      const components = place.address_components || [];
      let streetNumber = '';
      let streetName = '';
      let city = '';
      let state = '';
      let zipCode = '';
      let country = '';

      components.forEach((component: any) => {
        const types = component.types;
        if (types.includes('street_number')) {
          streetNumber = component.long_name;
        } else if (types.includes('route')) {
          streetName = component.long_name;
        } else if (types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          state = component.short_name;
        } else if (types.includes('postal_code')) {
          zipCode = component.long_name;
        } else if (types.includes('country')) {
          country = component.short_name;
        }
      });

      // If no street number from Google Places, try to extract it from user's typed input
      if (!streetNumber && userInput) {
        const match = userInput.match(/^(\d+)\s/);
        if (match) {
          streetNumber = match[1];
        }
      }

      // Build complete address with street number
      const parts: string[] = [];
      if (streetNumber) parts.push(streetNumber);
      if (streetName) parts.push(streetName);
      if (parts.length > 0) {
        const street = parts.join(' ');
        const addressParts = [street];
        if (city) addressParts.push(city);
        if (state) addressParts.push(state);
        if (zipCode) addressParts.push(zipCode);
        if (country) addressParts.push(country);
        return addressParts.join(', ');
      }

      // Fallback to formatted_address or name
      if (place.formatted_address) {
        // If formatted_address doesn't have street number but user typed one, prepend it
        if (!streetNumber && userInput) {
          const match = userInput.match(/^(\d+)\s/);
          if (match && !/^\d+/.test(place.formatted_address)) {
            return match[1] + ' ' + place.formatted_address;
          }
        }
        return place.formatted_address;
      }

      // Fallback to name if available
      return place.name || '';
    };

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      
      // Mark that a place was just selected to prevent blur handler from interfering
      placeSelectedRef.current = true;
      
      // Get the user's typed input before the selection
      const userInput = userTypedInputRef.current || inputRef.current?.value || '';
      
      if (place.geometry) {
        const lat = place.geometry.location?.lat();
        const lng = place.geometry.location?.lng();
        
        // Only proceed if we have valid coordinates (not 0,0 or NaN)
        if (lat && lng && lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
          // Build complete address with street number, preserving user's typed number if needed
          const fullAddress = buildAddressFromComponents(place, userInput);
          
          const placeDetails: PlaceDetails = {
            lat,
            lng,
            formattedAddress: fullAddress,
          };

          // Call onChange with both address and place details (valid coordinates)
          // This is crucial for form validation - it must be called synchronously
          // React Hook Form will handle updating the input value via the value prop
          if (onChange) {
            onChange(fullAddress, placeDetails);
          }
          
          // Update input value to match what we just set (React Hook Form should handle this, but ensure it matches)
          if (inputRef.current && inputRef.current.value !== fullAddress) {
            inputRef.current.value = fullAddress;
          }
          
          // Clear the flag after a delay to allow normal blur handling in the future
          setTimeout(() => {
            placeSelectedRef.current = false;
          }, 500);
        } else {
          console.warn('Invalid coordinates from place selection:', { lat, lng });
          // Update address but don't pass coordinates
          const fullAddress = buildAddressFromComponents(place, userInput);
          if (onChange) {
            onChange(fullAddress);
          }
          // Update input value to match (React Hook Form should handle this, but ensure it matches)
          if (inputRef.current && inputRef.current.value !== fullAddress) {
            inputRef.current.value = fullAddress;
          }
          
          // Clear the flag even if coordinates are invalid
          setTimeout(() => {
            placeSelectedRef.current = false;
          }, 500);
        }

        // Clear loading state
        setIsLoadingGeo(false);
      } else {
        // No geometry - clear flag
        setTimeout(() => {
          placeSelectedRef.current = false;
        }, 500);
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Store the user's typed input to preserve street number if needed
    userTypedInputRef.current = inputValue;
    
    // Update form value as user types
    if (onChange) {
      onChange(inputValue);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay blur handler to allow clicking on autocomplete dropdown
    // The Google Places autocomplete dropdown renders after the input
    // so we need to check if the relatedTarget (where focus is going) is within the autocomplete container
    setTimeout(() => {
      // If a place was just selected from autocomplete, don't geocode
      // This prevents the blur handler from interfering with the selection
      if (placeSelectedRef.current) {
        console.log('Place was just selected from autocomplete - skipping geocoding');
        return;
      }
      
      // Check if focus moved to an autocomplete suggestion
      const activeElement = document.activeElement;
      const isClickingAutocomplete = activeElement?.closest('.pac-container');
      
      // Only geocode if we're not clicking on autocomplete suggestions
      if (!isClickingAutocomplete && inputRef.current?.value && !isLoadingGeo) {
        // Check if place was already selected by autocomplete
        // If autocomplete worked, the place_changed event would have fired
        // So we only geocode if we have a value but no valid coordinates were set
        geocodeAddress(inputRef.current.value);
      }
    }, 300);
  };

  // Helper function to build full address from geocoding results
  const buildAddressFromGeocodeResult = (place: any, originalAddress: string): string => {
    // Check if original address starts with a street number (digit followed by space)
    const originalHasStreetNumber = /^\d+\s/.test(originalAddress);
    
    // Prefer formatted_address as it usually includes street number
    if (place.formatted_address) {
      // If original had street number but formatted doesn't, preserve original street number
      if (originalHasStreetNumber && !/^\d+\s/.test(place.formatted_address)) {
        const originalNumber = originalAddress.match(/^(\d+\s)/)?.[1] || '';
        return originalNumber + place.formatted_address;
      }
      return place.formatted_address;
    }

    // Build from address components if formatted_address is missing
    const components = place.address_components || [];
    let streetNumber = '';
    let streetName = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let country = '';

    components.forEach((component: any) => {
      const types = component.types;
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) {
        streetName = component.long_name;
      } else if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.short_name;
      } else if (types.includes('postal_code')) {
        zipCode = component.long_name;
      } else if (types.includes('country')) {
        country = component.short_name;
      }
    });

    // Build complete address with street number
    const parts: string[] = [];
    if (streetNumber) parts.push(streetNumber);
    if (streetName) parts.push(streetName);
    if (parts.length > 0) {
      const street = parts.join(' ');
      const addressParts = [street];
      if (city) addressParts.push(city);
      if (state) addressParts.push(state);
      if (zipCode) addressParts.push(zipCode);
      if (country) addressParts.push(country);
      return addressParts.join(', ');
    }

    // Fallback to original address if we can't build from components
    return originalAddress;
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
          
          // Only proceed if we have valid coordinates (not 0,0 or NaN)
          if (lat && lng && lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
            // Build complete address with street number from geocoding result
            const fullAddress = buildAddressFromGeocodeResult(place, address);
            
            const placeDetails: PlaceDetails = {
              lat,
              lng,
              formattedAddress: fullAddress,
            };

            // Update input with complete formatted address
            if (inputRef.current) {
              inputRef.current.value = fullAddress;
            }

            // Call onChange to update form state with complete address and valid coordinates
            if (onChange) {
              onChange(fullAddress, placeDetails);
            }
          } else {
            console.warn('Geocoding returned invalid coordinates:', { lat, lng, status });
            // Update address but don't set coordinates
            const fullAddress = buildAddressFromGeocodeResult(place, address);
            if (inputRef.current) {
              inputRef.current.value = fullAddress;
            }
            if (onChange) {
              onChange(fullAddress);
            }
          }
        } else {
          console.warn('Geocoding failed:', { status, address });
          // Geocoding failed - keep original address but don't set coordinates
          if (onChange) {
            onChange(address);
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
          autoComplete="address-line1"
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
});
