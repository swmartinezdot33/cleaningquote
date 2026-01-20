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
    // Check authentication (basic admin check)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = await getGHLToken();
    const locationId = await getGHLLocationId();

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID not configured' },
        { status: 400 }
      );
    }

    // Fetch calendars from GHL API v2
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
      const errorData = await response.json();
      console.error('GHL calendars error:', errorData);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid GHL token or missing calendars.readonly scope' },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Permission denied. Ensure you have calendars.write scope enabled.' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch calendars from GHL' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // GHL API returns calendars in different structures, handle multiple
    let calendars: GHLCalendar[] = [];

    if (data.calendars && Array.isArray(data.calendars)) {
      calendars = data.calendars.map((cal: any) => ({
        id: cal.id,
        name: cal.name || `Calendar ${cal.id.substring(0, 8)}`,
      }));
    } else if (data.data && Array.isArray(data.data)) {
      calendars = data.data.map((cal: any) => ({
        id: cal.id,
        name: cal.name || `Calendar ${cal.id.substring(0, 8)}`,
      }));
    } else if (Array.isArray(data)) {
      calendars = data.map((cal: any) => ({
        id: cal.id,
        name: cal.name || `Calendar ${cal.id.substring(0, 8)}`,
      }));
    }

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
