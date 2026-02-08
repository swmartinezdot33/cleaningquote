import { NextRequest } from 'next/server';

/**
 * Extract location ID from request (query param or header).
 * Used when app is loaded in GHL iframe - client passes locationId from GHL context.
 */
export function getLocationIdFromRequest(request: NextRequest): string | undefined {
  const queryLocationId = request.nextUrl.searchParams.get('locationId');
  if (queryLocationId) return queryLocationId;

  const headerLocationId = request.headers.get('x-ghl-location-id');
  if (headerLocationId) return headerLocationId;

  return undefined;
}

/**
 * Get location ID from request body (for POST/PATCH)
 */
export async function getLocationIdFromBody(request: NextRequest): Promise<string | undefined> {
  try {
    const body = await request.json().catch(() => ({}));
    return body.locationId || body.ghlLocationId || body.location_id;
  } catch {
    return undefined;
  }
}

/**
 * Get location ID from request (tries query, header, then body)
 */
export async function getLocationId(request: NextRequest): Promise<string | undefined> {
  const locationId = getLocationIdFromRequest(request);
  if (locationId) return locationId;
  return await getLocationIdFromBody(request);
}
