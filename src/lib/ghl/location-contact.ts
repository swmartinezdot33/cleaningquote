/**
 * Fetch org contact details (name, email, phone, address) from GHL location
 * (Business Profile). Used by org-contact API so tools show the location's
 * business info instead of manual Settings page data.
 */

import { getOrFetchTokenForLocation } from '@/lib/ghl/token-store';
import { getLocationWithToken } from '@/lib/ghl/client';
import { getOrgIdFromToolId, getGHLLocationIdForOrg } from '@/lib/config/store';

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

/**
 * Get the business/location name for display (e.g. quote summary header).
 * Uses GHL location API; returns null if no token or API fails.
 */
export async function getLocationBusinessName(ghlLocationId: string): Promise<string | null> {
  const details = await getLocationContactDetails(ghlLocationId);
  const name = details?.orgName?.trim();
  return name || null;
}

/**
 * Get the GHL location business name for a tool (for quote summary header, etc.).
 * Returns null if tool has no org, no GHL location, or API fails.
 */
export async function getBusinessNameForToolId(toolId: string): Promise<string | null> {
  if (!toolId?.trim()) return null;
  const orgId = await getOrgIdFromToolId(toolId);
  if (!orgId) return null;
  const ghlLocationId = await getGHLLocationIdForOrg(orgId);
  if (!ghlLocationId) return null;
  return getLocationBusinessName(ghlLocationId);
}

/**
 * Get full location contact details (name, email, phone, address) for a tool.
 * Used for quote page footer and contact info so they stay in sync with GHL.
 */
export async function getLocationContactDetailsForToolId(
  toolId: string
): Promise<LocationContactDetails | null> {
  if (!toolId?.trim()) return null;
  const orgId = await getOrgIdFromToolId(toolId);
  if (!orgId) return null;
  const ghlLocationId = await getGHLLocationIdForOrg(orgId);
  if (!ghlLocationId) return null;
  return getLocationContactDetails(ghlLocationId);
}
