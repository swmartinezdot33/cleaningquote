/**
 * Fetch org contact details (name, email, phone, address) from GHL location
 * (Business Profile). Used by org-contact API so tools show the location's
 * business info instead of manual Settings page data.
 */

import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';
import { getLocationWithToken } from '@/lib/ghl/client';

export interface LocationContactDetails {
  orgName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  officeAddress: string | null;
}

/**
 * Get contact details for a GHL location from the Location API (Business Profile).
 * Returns null if no token or API fails (caller should fallback to org row).
 */
export async function getLocationContactDetails(
  ghlLocationId: string
): Promise<LocationContactDetails | null> {
  const token = await getOrFetchTokenForLocation(ghlLocationId);
  if (!token) return null;

  const location = await getLocationWithToken(ghlLocationId, token);
  if (!location || typeof location !== 'object') return null;

  const name =
    typeof location.name === 'string'
      ? location.name.trim()
      : typeof (location as { companyName?: string }).companyName === 'string'
        ? (location as { companyName: string }).companyName.trim()
        : '';
  const email =
    typeof location.email === 'string' && location.email.trim()
      ? location.email.trim()
      : null;
  const phone =
    typeof location.phone === 'string' && location.phone.trim()
      ? location.phone.trim()
      : null;
  const addressParts = [
    typeof location.address === 'string' ? location.address.trim() : '',
    typeof location.city === 'string' ? location.city.trim() : '',
    typeof location.state === 'string' ? location.state.trim() : '',
    typeof location.postalCode === 'string' ? location.postalCode.trim() : '',
    typeof location.country === 'string' ? location.country.trim() : '',
  ].filter(Boolean);
  const officeAddress =
    addressParts.length > 0 ? addressParts.join(', ') : null;

  return {
    orgName: name || 'Business',
    contactEmail: email,
    contactPhone: phone,
    officeAddress,
  };
}
