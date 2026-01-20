import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';

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

    // Always use stored locationId for sub-account (location-level) API calls
    const locationId = await getGHLLocationId();
    
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required. Please configure it in the admin settings.' },
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
