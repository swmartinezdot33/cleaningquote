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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Use OpenStreetMap/Nominatim for autocomplete (free alternative to Google Places)
  const handleAddressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    if (onChange) {
      onChange(inputValue);
    }

    // Get autocomplete suggestions from Nominatim (free, no API key needed)
    if (inputValue.length > 2) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(inputValue)}&countrycodes=us&limit=5`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await response.json();
        const displayNames = data.map((item: any) => item.display_name).slice(0, 5);
        setSuggestions(displayNames);
        setShowSuggestions(true);
      } catch (err) {
        console.warn('Nominatim autocomplete error:', err);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (inputRef.current) {
      inputRef.current.value = suggestion;
      if (onChange) {
        onChange(suggestion);
      }
    }
    setSuggestions([]);
    setShowSuggestions(false);
    // Trigger geocoding for the selected suggestion
    geocodeAddress(suggestion);
  };

  const geocodeAddress = (address: string) => {
    if (!address) return;

    // Try Google Maps geocoding first if available
    if (window.google?.maps?.Geocoder) {
      setIsLoadingGeo(true);
      try {
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

              if (onChange) {
                onChange(placeDetails.formattedAddress, placeDetails);
              }
            } else {
              // Fallback to Nominatim geocoding
              fallbackGeocode(address);
            }
          }
        );
      } catch (err) {
        setIsLoadingGeo(false);
        fallbackGeocode(address);
      }
    } else {
      fallbackGeocode(address);
    }
  };

  const fallbackGeocode = async (address: string) => {
    setIsLoadingGeo(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=us&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      
      if (data?.[0]) {
        const place = data[0];
        const placeDetails: PlaceDetails = {
          lat: parseFloat(place.lat) || 0,
          lng: parseFloat(place.lon) || 0,
          formattedAddress: place.display_name || address,
        };

        if (onChange) {
          onChange(placeDetails.formattedAddress, placeDetails);
        }
      }
    } catch (err) {
      console.warn('Nominatim geocoding error:', err);
    } finally {
      setIsLoadingGeo(false);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow click
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);

    // Geocode on blur if not already done
    if (inputRef.current?.value && !isLoadingGeo) {
      geocodeAddress(inputRef.current.value);
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
          placeholder={placeholder || 'Enter your address (e.g., 123 Main St, Raleigh, NC)'}
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

        {/* Address Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50"
            >
              {suggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                  whileHover={{ backgroundColor: '#f3f4f6' }}
                >
                  {suggestion}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
