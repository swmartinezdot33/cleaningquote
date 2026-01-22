import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId, getGHLConfig } from '@/lib/kv';

/**
 * GET - Get available time slots for a date range
 * Query params: type ('appointment' | 'call'), from (timestamp in ms), to (timestamp in ms)
 * Returns available slots grouped by date
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getGHLToken();
    const locationId = await getGHLLocationId();
    
    if (!token || !locationId) {
      return NextResponse.json(
        { error: 'GHL not configured' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'appointment' or 'call'
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    if (!type || !fromParam || !toParam) {
      return NextResponse.json(
        { error: 'type, from, and to are required' },
        { status: 400 }
      );
    }

    const fromTime = parseInt(fromParam, 10);
    const toTime = parseInt(toParam, 10);

    if (isNaN(fromTime) || isNaN(toTime)) {
      return NextResponse.json(
        { error: 'from and to must be valid timestamps in milliseconds' },
        { status: 400 }
      );
    }

    // Get GHL config to determine which calendar to check
    const ghlConfig = await getGHLConfig();
    
    let calendarId: string | undefined;
    if (type === 'call') {
      calendarId = ghlConfig?.callCalendarId;
    } else {
      calendarId = ghlConfig?.appointmentCalendarId;
    }

    if (!calendarId) {
      return NextResponse.json(
        { error: `Calendar not configured for ${type}` },
        { status: 400 }
      );
    }

    // Use GHL's free-slots endpoint
    const freeSlotsResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?from=${fromTime}&to=${toTime}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!freeSlotsResponse.ok) {
      const errorText = await freeSlotsResponse.text();
      console.error(`GHL free-slots API error (${freeSlotsResponse.status}):`, errorText);

      if (freeSlotsResponse.status === 404) {
        return NextResponse.json({
          slots: {},
          message: 'No available time slots found for this calendar',
        });
      }

      if (freeSlotsResponse.status === 401 || freeSlotsResponse.status === 403) {
        return NextResponse.json({
          error: 'Unable to check availability - calendar access denied',
        }, { status: 401 });
      }

      // Return empty slots on error
      return NextResponse.json({
        slots: {},
        error: `Failed to fetch slots: ${freeSlotsResponse.status}`,
      });
    }

    const freeSlotsData = await freeSlotsResponse.json();
    
    // GHL free-slots API returns data in format: { "YYYY-MM-DD": [{ start: timestamp, end: timestamp }, ...] }
    // or sometimes: { slots: { "YYYY-MM-DD": [...] } }
    const slots = freeSlotsData.slots || freeSlotsData.data || freeSlotsData || {};

    // Normalize the response format
    const normalizedSlots: Record<string, Array<{ start: number; end: number }>> = {};
    
    Object.keys(slots).forEach((dateKey) => {
      const dateSlots = slots[dateKey];
      if (Array.isArray(dateSlots) && dateSlots.length > 0) {
        normalizedSlots[dateKey] = dateSlots.map((slot: any) => ({
          start: typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime(),
          end: typeof slot.end === 'number' ? slot.end : new Date(slot.end).getTime(),
        }));
      }
    });

    return NextResponse.json({
      slots: normalizedSlots,
      count: Object.values(normalizedSlots).reduce((sum, arr) => sum + arr.length, 0),
    });
  } catch (error) {
    console.error('Error fetching calendar slots:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch calendar slots',
        slots: {},
      },
      { status: 500 }
    );
  }
}
