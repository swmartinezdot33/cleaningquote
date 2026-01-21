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

  // Update input value when value prop changes
  useEffect(() => {
    if (inputRef.current && value !== undefined) {
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
    const buildAddressFromComponents = (place: any): string => {
      if (place.formatted_address) {
        // Use formatted_address if available, it usually includes street number
        return place.formatted_address;
      }

      // Build address from components if formatted_address is missing
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

      // Fallback to name if available
      return place.name || '';
    };

    // Listen for place selection
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      
      if (place.geometry) {
        const lat = place.geometry.location?.lat();
        const lng = place.geometry.location?.lng();
        
        // Only proceed if we have valid coordinates (not 0,0 or NaN)
        if (lat && lng && lat !== 0 && lng !== 0 && !isNaN(lat) && !isNaN(lng)) {
          // Build complete address with street number
          const fullAddress = buildAddressFromComponents(place);
          
          const placeDetails: PlaceDetails = {
            lat,
            lng,
            formattedAddress: fullAddress,
          };

          // Update input value immediately with complete address
          if (inputRef.current) {
            inputRef.current.value = fullAddress;
            // Trigger input event to ensure form state is updated
            const event = new Event('input', { bubbles: true });
            inputRef.current.dispatchEvent(event);
          }

          // Call onChange with both address and place details (valid coordinates)
          // This is crucial for form validation - it must be called synchronously
          if (onChange) {
            onChange(fullAddress, placeDetails);
          }
        } else {
          console.warn('Invalid coordinates from place selection:', { lat, lng });
          // Update address but don't pass coordinates
          const fullAddress = buildAddressFromComponents(place);
          if (inputRef.current) {
            inputRef.current.value = fullAddress;
          }
          if (onChange) {
            onChange(fullAddress);
          }
        }

        // Clear loading state
        setIsLoadingGeo(false);
      }
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
