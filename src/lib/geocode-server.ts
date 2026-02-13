import { createHash } from 'crypto';

/** Normalize address for cache key: trim, lowercase, collapse spaces. */
export function normalizeAddressForHash(address: string): string {
  return (address || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** SHA256 hex hash of normalized address for cache key. */
export function hashAddress(normalized: string): string {
  if (!normalized) return '';
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export interface GeocodeResult {
  lat: number;
  lng: number;
}

/**
 * Geocode a single address using Google Geocoding API (server-side).
 * Returns null if no API key, request fails, or no result.
 */
export async function geocodeAddressServer(
  address: string,
  apiKey: string | null
): Promise<GeocodeResult | null> {
  const trimmed = (address || '').trim();
  if (!trimmed || !apiKey) return null;
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', trimmed);
    url.searchParams.set('key', apiKey);
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as {
      results?: Array<{ geometry?: { location?: { lat: number; lng: number } } }>;
      status?: string;
    } | null;
    if (data?.status !== 'OK' || !data?.results?.[0]?.geometry?.location) return null;
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

/**
 * Geocode multiple addresses in parallel with a concurrency limit.
 * Returns array of results in same order as input; null for failed/missing.
 */
export async function geocodeAddressesBatch(
  addresses: string[],
  apiKey: string | null,
  concurrency = 10
): Promise<(GeocodeResult | null)[]> {
  if (!addresses.length || !apiKey) return addresses.map(() => null);
  const results: (GeocodeResult | null)[] = [];
  for (let i = 0; i < addresses.length; i += concurrency) {
    const chunk = addresses.slice(i, i + concurrency);
    const chunkResults = await Promise.all(
      chunk.map((addr) => geocodeAddressServer(addr, apiKey))
    );
    results.push(...chunkResults);
  }
  return results;
}
