import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';

function authenticate(request: NextRequest) {
  const password = request.headers.get('x-admin-password');
  
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return null;
}

/**
 * GET - Check calendar availability using GHL's free-slots API
 * Query params: calendarId, startTime (ISO string), endTime (ISO string)
 * Uses GHL calendar configuration and real-time availability
 */
export async function GET(request: NextRequest) {
  const authResponse = authenticate(request);
  if (authResponse) return authResponse;

  try {
    const token = await getGHLToken();
    const locationId = await getGHLLocationId();
    
    if (!token) {
      return NextResponse.json(
        { error: 'GHL token not configured' },
        { status: 400 }
      );
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required. Please configure it in the admin settings.' },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const calendarId = url.searchParams.get('calendarId');
    const startTime = url.searchParams.get('startTime');
    const endTime = url.searchParams.get('endTime');

    if (!calendarId) {
      return NextResponse.json(
        { error: 'calendarId is required' },
        { status: 400 }
      );
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'startTime and endTime are required (ISO string format)' },
        { status: 400 }
      );
    }

    // Parse ISO timestamps to milliseconds (GHL free-slots API requires milliseconds)
    const fromTime = new Date(startTime).getTime();
    const toTime = new Date(endTime).getTime();

    // Use GHL's free-slots endpoint which respects calendar configuration
    // GET /calendars/:calendarId/free-slots?startDate={ts}&endDate={ts}&locationId={id}
    // locationId required for sub-account/location-level API
    const freeSlotsResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?startDate=${fromTime}&endDate=${toTime}&locationId=${locationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
          'Location-Id': locationId,
        },
      }
    );

    if (!freeSlotsResponse.ok) {
      const errorText = await freeSlotsResponse.text();
      console.error(`GHL free-slots API error (${freeSlotsResponse.status}):`, errorText);

      // Try to parse error message for specific issues
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // Not JSON, use text as is
      }

      if (freeSlotsResponse.status === 404) {
        // Calendar might not have free slots configured
        return NextResponse.json({
          available: false,
          message: 'No available time slots found for this calendar. Check calendar configuration and assigned users.',
          slots: [],
        });
      }

      if (freeSlotsResponse.status === 422) {
        // Check for specific 422 errors
        const errorMessage = errorData.message || errorText || '';
        const errorMessageStr = typeof errorMessage === 'string' ? errorMessage : (Array.isArray(errorMessage) ? errorMessage.join(', ') : JSON.stringify(errorMessage));
        
        if (errorMessageStr.includes('No users found') || errorMessageStr.includes('no users')) {
          return NextResponse.json({
            available: false,
            message: 'Calendar has no users assigned in GHL. Even if you assigned users here, you must also:\n1. Go to GHL → Calendar settings\n2. Open the calendar\n3. Assign users to the calendar\n4. Configure availability/office hours for those users\n\nThe calendar needs users assigned AND availability configured to generate time slots.',
            slots: [],
            error: 'No users assigned to calendar in GHL',
            helpUrl: 'https://help.gohighlevel.com/support/solutions/articles/48001181963-how-to-assign-users-to-a-calendar',
          });
        }
        // Generic 422 error
        return NextResponse.json({
          available: false,
          message: errorMessageStr || 'Calendar configuration error. Please check calendar settings in GHL.',
          slots: [],
          error: errorData.error || 'Calendar configuration error',
        });
      }

      if (freeSlotsResponse.status === 401 || freeSlotsResponse.status === 403) {
        return NextResponse.json(
          { error: 'Invalid GHL token or missing calendars.readonly scope' },
          { status: 401 }
        );
      }

      // Fallback to events check
      return checkAvailabilityViaEvents(token, locationId, calendarId, startTime, endTime);
    }

    const freeSlotsData = await freeSlotsResponse.json();
    
    // GHL free-slots API returns: { "YYYY-MM-DD": [...] } or { "YYYY-MM-DD": { slots: [...] } } or { slots: { "YYYY-MM-DD": [...] } }
    const allSlots: any[] = [];
    let toIterate = freeSlotsData;
    if (freeSlotsData?.slots && typeof freeSlotsData.slots === 'object') toIterate = freeSlotsData.slots;
    if (freeSlotsData?.data && typeof freeSlotsData.data === 'object') toIterate = freeSlotsData.data;
    Object.keys(toIterate || {}).forEach((dateKey) => {
      if (dateKey === 'traceId' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
      const slots = toIterate[dateKey];
      if (Array.isArray(slots)) {
        allSlots.push(...slots);
      } else if (slots?.slots && Array.isArray(slots.slots)) {
        allSlots.push(...slots.slots);
      }
    });

    const totalSlots = allSlots.length;
    const isAvailable = totalSlots > 0;

    return NextResponse.json({
      available: isAvailable,
      message: isAvailable 
        ? `Calendar has ${totalSlots} available time slot(s) in this range` 
        : 'No available time slots found in this time range',
      slots: allSlots,
      slotCount: totalSlots,
    });
  } catch (error) {
    console.error('Error checking calendar availability:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check calendar availability',
        available: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Fallback function to check availability via events API
 */
async function checkAvailabilityViaEvents(
  token: string,
  locationId: string,
  calendarId: string,
  startTime: string,
  endTime: string
) {
  try {
    const eventsResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/events?locationId=${locationId}&calendarId=${calendarId}&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-04-15',
        },
      }
    );

    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      const events = eventsData.events || eventsData.data || eventsData || [];
      const eventsArray = Array.isArray(events) ? events : [];

      return NextResponse.json({
        available: eventsArray.length === 0,
        message: eventsArray.length === 0
          ? 'Calendar is available (no events found in this time range)'
          : `Found ${eventsArray.length} event(s) in this time range`,
        events: eventsArray,
        eventCount: eventsArray.length,
        fallback: true,
      });
    }
  } catch (error) {
    console.error('Fallback availability check failed:', error);
  }

  return NextResponse.json(
    { error: `Failed to check calendar availability`, available: false },
    { status: 200 }
  );
}
