import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';

// Force dynamic rendering - this route uses request headers
export const dynamic = 'force-dynamic';

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
    // Correct endpoint: /opportunities/pipelines?locationId={locationId}
    const pipelinesResponse = await fetch(
      `https://services.leadconnectorhq.com/opportunities/pipelines?locationId=${locationId}`,
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
      let errorMessage = `HTTP ${pipelinesResponse.status}`;
      let errorDetails: any = {};
      
      try {
        const errorData = await pipelinesResponse.json();
        errorDetails = errorData;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.msg) {
          errorMessage = errorData.msg;
        }
      } catch {
        // If JSON parsing fails, try to get text
        const text = await pipelinesResponse.text().catch(() => '');
        errorMessage = text || pipelinesResponse.statusText || `HTTP ${pipelinesResponse.status}`;
      }

      // Provide helpful error messages based on status code
      if (pipelinesResponse.status === 401) {
        const details = errorDetails.message || errorDetails.error || errorMessage;
        return NextResponse.json(
          { 
            error: 'Unauthorized - Invalid token or missing required scopes',
            details: `GHL API says: ${details}. Make sure your PIT token has opportunities.readonly scope.`
          },
          { status: 401 }
        );
      } else if (pipelinesResponse.status === 403) {
        const details = errorDetails.message || errorDetails.error || errorMessage;
        return NextResponse.json(
          { 
            error: 'Forbidden - Token may not have sufficient permissions',
            details: `GHL API says: ${details}. Ensure your PIT token has opportunities.readonly scope and the Location ID is correct.`
          },
          { status: 403 }
        );
      } else if (pipelinesResponse.status === 404) {
        return NextResponse.json(
          { 
            error: 'Location not found',
            details: `The Location ID "${locationId}" was not found. Please verify the Location ID is correct.`
          },
          { status: 404 }
        );
      } else {
        return NextResponse.json(
          { 
            error: 'Failed to fetch pipelines',
            details: `GHL API returned ${pipelinesResponse.status}: ${errorMessage}`
          },
          { status: pipelinesResponse.status }
        );
      }
    }

    let pipelinesData;
    try {
      pipelinesData = await pipelinesResponse.json();
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Invalid response from GHL API',
          details: 'The API response could not be parsed as JSON'
        },
        { status: 500 }
      );
    }

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
    console.error('Error fetching GHL pipelines:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to fetch GHL pipelines', 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
