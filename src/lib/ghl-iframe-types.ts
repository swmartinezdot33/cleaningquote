/**
 * GHL Iframe Types
 * Shared types for GHL iframe context (user/location from GHL parent via postMessage)
 */

export interface GHLIframeData {
  locationId?: string;
  userId?: string;
  companyId?: string;
  locationName?: string;
  userName?: string;
  userEmail?: string;
  [key: string]: unknown;
}
