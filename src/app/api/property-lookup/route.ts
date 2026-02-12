import { NextRequest, NextResponse } from 'next/server';

export type PropertyLookupResponse = {
  squareFeet?: number;
  bedrooms?: number;
  fullBaths?: number;
  halfBaths?: number;
  source?: string;
};

/**
 * POST /api/property-lookup
 * Look up property details (sq ft, beds, baths) by address.
 * When RAPIDAPI_KEY and RAPIDAPI_PROPERTY_HOST are set, calls that API (e.g. Zillow-style)
 * and maps common response fields. Otherwise returns {} (client skips "Is this correct?").
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const address = typeof body?.address === 'string' ? body.address.trim() : '';

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const result = await fetchPropertyData(address);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Property lookup error:', error);
    return NextResponse.json(
      {} as PropertyLookupResponse,
      { status: 200 }
    );
  }
}

function toNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Map various API response shapes to our PropertyLookupResponse */
function mapPropertyResponse(data: Record<string, unknown>): PropertyLookupResponse {
  const out: PropertyLookupResponse = {};

  // Square footage: livingArea, sqft, squareFeet, area, finishedSqFt, etc.
  const sqft =
    toNumber(data.livingArea) ??
    toNumber(data.sqft) ??
    toNumber(data.squareFeet) ??
    toNumber(data.area) ??
    toNumber(data.finishedSqFt) ??
    toNumber(data.buildingSize);
  if (sqft != null && sqft > 0) out.squareFeet = Math.round(sqft);

  // Bedrooms: bedrooms, beds, bed, roomCount
  const beds =
    toNumber(data.bedrooms) ??
    toNumber(data.beds) ??
    toNumber(data.bed) ??
    toNumber(data.roomCount);
  if (beds != null && beds >= 0) out.bedrooms = Math.round(beds);

  // Full baths: fullBaths, fullBath, or floor(bathrooms) when API gives one number (e.g. 2.5)
  let fullBaths =
    toNumber(data.fullBaths) ??
    toNumber(data.fullBath) ??
    toNumber(data.bathrooms) ??
    toNumber(data.bath);
  let halfBaths = toNumber(data.halfBaths) ?? toNumber(data.halfBath);
  if (fullBaths != null && halfBaths == null && fullBaths % 1 !== 0) {
    halfBaths = fullBaths % 1 >= 0.5 ? 1 : 0;
    fullBaths = Math.floor(fullBaths);
  }
  if (fullBaths != null && fullBaths >= 0) out.fullBaths = Math.round(fullBaths);
  if (halfBaths != null && halfBaths >= 0) out.halfBaths = Math.round(halfBaths);

  return out;
}

async function fetchFromRapidAPI(address: string): Promise<PropertyLookupResponse> {
  const apiKey = process.env.RAPIDAPI_KEY?.trim();
  const host = process.env.RAPIDAPI_PROPERTY_HOST?.trim();
  if (!apiKey || !host) return {};

  const path = (process.env.RAPIDAPI_PROPERTY_PATH?.trim() || '/propertyByAddress').replace(/^\//, '');
  const url = `https://${host}/${path}?address=${encodeURIComponent(address)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return {};

    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') return {};

    // Some APIs wrap the property in a key (e.g. data.property, result, body)
    const payload =
      (data.data as Record<string, unknown>) ??
      (data.result as Record<string, unknown>) ??
      (data.body as Record<string, unknown>) ??
      (data.property as Record<string, unknown>) ??
      data;

    const mapped = mapPropertyResponse(
      payload && typeof payload === 'object' ? payload : (data as Record<string, unknown>)
    );
    if (
      mapped.squareFeet != null ||
      mapped.bedrooms != null ||
      mapped.fullBaths != null ||
      mapped.halfBaths != null
    ) {
      mapped.source = 'rapidapi';
      return mapped;
    }
    return {};
  } catch {
    return {};
  }
}

async function fetchPropertyData(address: string): Promise<PropertyLookupResponse> {
  const rapid = await fetchFromRapidAPI(address);
  if (
    rapid.squareFeet != null ||
    rapid.bedrooms != null ||
    rapid.fullBaths != null ||
    rapid.halfBaths != null
  ) {
    return rapid;
  }

  // Optional: validate address with Google when RapidAPI not configured or returned nothing
  const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (apiKey) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.searchParams.set('address', address);
      url.searchParams.set('key', apiKey);
      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { results?: unknown[] } | null;
        if (data?.results?.length) {
          // Address valid; no property details from Google
          return {};
        }
      }
    } catch {
      // ignore
    }
  }

  return {};
}
