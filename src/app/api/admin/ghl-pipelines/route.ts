import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken } from '@/lib/kv';

function authenticate(request: NextRequest): NextResponse | null {
  const password = request.headers.get('x-admin-password');
  const requiredPassword = process.env.ADMIN_PASSWORD;

  if (requiredPassword && password !== requiredPassword) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing password.' },
      { status: 401 }
    );
  }
  return null;
}

/**
 * GET - Fetch location and pipelines from GHL
 */
export async function GET(request: NextRequest) {
  const authResponse = authenticate(request);
  if (authResponse) return authResponse;

  try {
    const token = await getGHLToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'GHL token not configured' },
        { status: 400 }
      );
    }

    // For API v2, get location ID from token using /oauth/installedLocations
    // This works for both agency-level and location-level PIT tokens
    let locationId: string | null = null;
    let locationName: string | null = null;
    
    try {
      // Use /oauth/installedLocations which works for both token types
      const locationsResponse = await fetch('https://services.leadconnectorhq.com/oauth/installedLocations', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      });

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || locationsData.data || [];
        if (locations.length > 0) {
          locationId = locations[0].id;
          locationName = locations[0].name || 'My Location';
        }
      }
    } catch (error) {
      console.warn('Failed to fetch installed locations:', error);
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Could not determine location ID from token. Please ensure your PIT token is valid.' },
        { status: 400 }
      );
    }

    // Fetch pipelines for this location (API v2)
    const pipelinesResponse = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/pipelines`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!pipelinesResponse.ok) {
      const errorData = await pipelinesResponse.json();
      throw new Error(`Failed to fetch pipelines: ${errorData.message || pipelinesResponse.statusText}`);
    }

    const pipelinesData = await pipelinesResponse.json();
    const pipelines = pipelinesData.pipelines || pipelinesData.data || [];

    return NextResponse.json({
      success: true,
      locationId,
      locationName,
      pipelines: pipelines.map((p: any) => ({
        id: p.id,
        name: p.name,
        stages: (p.stages || []).map((s: any) => ({
          id: s.id,
          name: s.name,
        })),
      })),
    });
  } catch (error) {
    console.error('Error fetching GHL data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GHL pipelines', details: (error as Error).message },
      { status: 500 }
    );
  }
}
