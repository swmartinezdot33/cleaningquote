import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';

interface GHLCalendar {
  id: string;
  name: string;
}

/**
 * GET /api/admin/ghl-calendars
 * Fetch available calendars from GHL for the current location
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication (basic admin check) - accept either Bearer token or password header
    const authHeader = request.headers.get('authorization');
    const passwordHeader = request.headers.get('x-admin-password');
    
    if (!authHeader && !passwordHeader) {
      console.error('No authentication header provided');
      return NextResponse.json(
        { error: 'Unauthorized - missing authentication' },
        { status: 401 }
      );
    }

    const token = await getGHLToken();
    const locationId = await getGHLLocationId();

    if (!token) {
      console.error('GHL token not configured');
      return NextResponse.json(
        { error: 'GHL token not configured. Please set up your GHL API token in settings.' },
        { status: 400 }
      );
    }

    if (!locationId) {
      console.error('Location ID not configured');
      return NextResponse.json(
        { error: 'Location ID not configured. Please set up your location ID in settings.' },
        { status: 400 }
      );
    }

    console.log(`Fetching calendars for location: ${locationId}`);

    // Fetch calendars from GHL API v2
    // According to GHL docs: GET /calendars
    // Location ID should be passed as query parameter for sub-account (location-level) API calls
    const response = await fetch(
      `https://services.leadconnectorhq.com/calendars?locationId=${locationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28', // GHL API v2
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GHL calendars error (${response.status}):`, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid GHL token or missing calendars.readonly scope' },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Permission denied. Ensure you have calendars.readonly scope enabled.' },
          { status: 403 }
        );
      }

      if (response.status === 404) {
        console.log('Calendars endpoint returned 404 - location may not have calendars configured');
        return NextResponse.json(
          { calendars: [], message: 'No calendars found. This may be normal if calendars are not configured in your location.' },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: `Failed to fetch calendars from GHL: ${response.status}`, calendars: [] },
        { status: 200 }
      );
    }

    const data = await response.json();

    console.log('[ghl-calendars] Response data structure:', JSON.stringify(data, null, 2).substring(0, 500));

    // GHL API returns calendars in different structures, handle multiple
    let calendars: GHLCalendar[] = [];

    if (data.calendars && Array.isArray(data.calendars)) {
      console.log(`[ghl-calendars] Found calendars in data.calendars: ${data.calendars.length} items`);
      calendars = data.calendars.map((cal: any) => ({
        id: cal.id,
        name: cal.name || `Calendar ${cal.id.substring(0, 8)}`,
      }));
    } else if (data.data && Array.isArray(data.data)) {
      console.log(`[ghl-calendars] Found calendars in data.data: ${data.data.length} items`);
      calendars = data.data.map((cal: any) => ({
        id: cal.id,
        name: cal.name || `Calendar ${cal.id.substring(0, 8)}`,
      }));
    } else if (Array.isArray(data)) {
      console.log(`[ghl-calendars] Found calendars as direct array: ${data.length} items`);
      calendars = data.map((cal: any) => ({
        id: cal.id,
        name: cal.name || `Calendar ${cal.id.substring(0, 8)}`,
      }));
    } else {
      console.log('[ghl-calendars] Warning: No calendar arrays found in response');
    }

    console.log(`[ghl-calendars] Successfully fetched ${calendars.length} calendars`);

    return NextResponse.json(
      { calendars },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching GHL calendars:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch calendars',
      },
      { status: 500 }
    );
  }
}
