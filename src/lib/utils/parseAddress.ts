/**
 * Parse a full address string into its components
 * Handles formats like:
 * - "123 Main St, Raleigh, NC 27601"
 * - "123 Main St, Raleigh, NC, 27601"
 * - "123 Main St, Raleigh, North Carolina 27601"
 * - "123 Main St, Raleigh, NC"
 * - "14 Main St, Suite 2, Oxford, MS 38655" (Address Line 2 combined into address1)
 */

export interface ParsedAddress {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

/**
 * Check if a string looks like an address line 2 (Suite, Apt, Unit, #, etc.)
 */
function isAddressLine2(part: string): boolean {
  if (!part) return false;
  
  const lower = part.toLowerCase();
  // Common address line 2 patterns
  const addressLine2Patterns = [
    /^(suite|apt|apartment|unit|#|number|no\.?|num\.?|ste|ste\.|bldg|building|floor|fl|room|rm)\s*/i,
    /^#\d+/i, // Starts with # followed by digits
  ];
  
  return addressLine2Patterns.some(pattern => pattern.test(part));
}

/**
 * Parse an address string into components
 * @param address - Full address string
 * @returns Parsed address components
 */
export function parseAddress(address: string): ParsedAddress {
  if (!address || typeof address !== 'string') {
    return { streetAddress: '', city: '', state: '', zipCode: '' };
  }

  const trimmed = address.trim();
  if (!trimmed) {
    return { streetAddress: '', city: '', state: '', zipCode: '' };
  }

  // Split by commas
  const parts = trimmed.split(',').map(p => p.trim()).filter(p => p.length > 0);

  if (parts.length === 0) {
    return { streetAddress: trimmed, city: '', state: '', zipCode: '' };
  }

  // Common US address formats:
  // Format 1: "Street Address, City, State ZIP"
  // Format 2: "Street Address, City, State, ZIP"
  // Format 3: "Street Address, Address Line 2, City, State ZIP" (e.g., "14 Main St, Suite 2, Oxford, MS 38655")
  // Format 4: "Street Address, Address Line 2, City, State, ZIP"
  // Format 5: "Street Address, City, State"
  // Format 6: "Street Address, City"

  let streetAddress = parts[0] || '';
  let city = '';
  let state = '';
  let zipCode = '';

  // Check if second part is an address line 2 (Suite, Apt, Unit, etc.)
  let addressLine2Index = -1;
  if (parts.length >= 2 && isAddressLine2(parts[1])) {
    // Combine address line 1 and address line 2
    streetAddress = `${parts[0]} ${parts[1]}`.trim();
    addressLine2Index = 1;
  }

  // Determine which part is the city based on whether we found an address line 2
  const cityIndex = addressLine2Index >= 0 ? 2 : 1;
  
  if (parts.length > cityIndex) {
    city = parts[cityIndex] || '';
  }

  // Determine state and zip based on remaining parts
  const stateIndex = addressLine2Index >= 0 ? 3 : 2;
  const zipIndex = addressLine2Index >= 0 ? 4 : 3;

  if (parts.length > stateIndex) {
    // The state part could be "State ZIP" or just "State"
    const statePart = parts[stateIndex];
    
    // Check if it contains a ZIP code (5 digits, optionally followed by -4 digits)
    const zipMatch = statePart.match(/\b(\d{5}(?:-\d{4})?)\b/);
    
    if (zipMatch) {
      zipCode = zipMatch[1];
      // Extract state (everything before the ZIP)
      state = statePart.replace(/\b\d{5}(?:-\d{4})?\b/, '').trim();
    } else {
      // No ZIP in state part, it's just the state
      state = statePart;
    }
  }

  if (parts.length > zipIndex) {
    // Additional part is likely the ZIP code
    const zipPart = parts[zipIndex];
    const zipMatch = zipPart.match(/\b(\d{5}(?:-\d{4})?)\b/);
    if (zipMatch) {
      zipCode = zipMatch[1];
    } else {
      zipCode = zipPart;
    }
  }

  // Clean up state (remove common prefixes/suffixes, normalize abbreviations)
  if (state) {
    state = state
      .replace(/^state\s*/i, '')
      .replace(/\s*state$/i, '')
      .trim();
    
    // If state looks like a full name, try to abbreviate common ones
    const stateAbbreviations: Record<string, string> = {
      'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
      'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
      'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
      'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
      'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
      'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
      'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
      'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
      'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
      'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
      'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
      'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
      'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC'
    };
    
    const stateLower = state.toLowerCase();
    if (stateAbbreviations[stateLower]) {
      state = stateAbbreviations[stateLower];
    } else if (state.length === 2) {
      // Already an abbreviation, uppercase it
      state = state.toUpperCase();
    }
  }

  return {
    streetAddress: streetAddress || '',
    city: city || '',
    state: state || '',
    zipCode: zipCode || '',
  };
}
