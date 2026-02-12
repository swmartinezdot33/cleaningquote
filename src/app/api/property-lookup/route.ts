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
 * Returns 200 with partial or empty fields so the client can fall back to normal survey flow.
 * Optional: set RAPIDAPI_KEY and RAPIDAPI_PROPERTY_HOST to enable a RapidAPI property provider.
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

async function fetchPropertyData(address: string): Promise<PropertyLookupResponse> {
  const apiKey = process.env.RAPIDAPI_KEY?.trim();
  const host = process.env.RAPIDAPI_PROPERTY_HOST?.trim() || 'zillow-com1.p.rapidapi.com';

  if (!apiKey) {
    return {};
  }

  try {
    const url = new URL('https://' + host + '/property');
    url.searchParams.set('address', address);

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return {};
    }

    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') {
      return {};
    }

    const squareFeet = parseNumber(data.livingArea ?? data.squareFeet ?? data.sqft);
    const bedrooms = parseNumber(data.bedrooms ?? data.beds);
    const bathrooms = parseNumber(data.bathrooms ?? data.baths);
    const fullBaths = typeof bathrooms === 'number' ? Math.floor(bathrooms) : undefined;
    const halfBaths =
      typeof bathrooms === 'number'
        ? Math.round((bathrooms - Math.floor(bathrooms)) * 2)
        : undefined;

    const hasAny =
      typeof squareFeet === 'number' ||
      typeof bedrooms === 'number' ||
      typeof fullBaths === 'number' ||
      typeof halfBaths === 'number';

    if (!hasAny) {
      return {};
    }

    return {
      ...(typeof squareFeet === 'number' && squareFeet > 0 && { squareFeet }),
      ...(typeof bedrooms === 'number' && bedrooms >= 0 && { bedrooms }),
      ...(typeof fullBaths === 'number' && fullBaths >= 0 && { fullBaths }),
      ...(typeof halfBaths === 'number' && halfBaths >= 0 && { halfBaths }),
      source: 'property_lookup',
    };
  } catch {
    return {};
  }
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = parseInt(value.replace(/,/g, ''), 10);
    if (!isNaN(n)) return n;
  }
  return undefined;
}
