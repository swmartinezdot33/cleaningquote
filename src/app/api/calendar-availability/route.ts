import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId, getGHLConfig } from '@/lib/kv';

/**
 * GET - Check calendar availability using GHL's free-slots API
 * Query params: type ('appointment' | 'call'), date (YYYY-MM-DD), time (HH:MM)
 * Uses GHL calendar configuration and real-time availability
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
    const date = url.searchParams.get('date'); // YYYY-MM-DD
    const time = url.searchParams.get('time'); // HH:MM

    if (!type || !date || !time) {
      return NextResponse.json(
        { error: 'type, date, and time are required' },
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

    // Parse date and time to create timestamps
    const dateTime = new Date(`${date}T${time}`);
    if (isNaN(dateTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date or time format' },
        { status: 400 }
      );
    }

    // Get free slots from GHL calendar API
    // GHL expects timestamps in milliseconds (13 digits)
    const fromTime = dateTime.getTime();
    // Check availability for the selected day (from start of day to end of day)
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const fromTimestamp = dayStart.getTime();
    const toTimestamp = dayEnd.getTime();

    // Use GHL's free-slots endpoint which respects calendar configuration
    // GET /calendars/:calendarId/free-slots?from={timestamp}&to={timestamp}
    const freeSlotsResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?from=${fromTimestamp}&to=${toTimestamp}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28', // Use API 2.0 version
        },
      }
    );

    if (!freeSlotsResponse.ok) {
      const errorText = await freeSlotsResponse.text();
      console.error(`GHL free-slots API error (${freeSlotsResponse.status}):`, errorText);

      if (freeSlotsResponse.status === 404) {
        // Calendar might not have free slots configured or no availability
        return NextResponse.json({
          available: false,
          message: 'No available time slots found for this calendar',
        });
      }

      if (freeSlotsResponse.status === 401 || freeSlotsResponse.status === 403) {
        return NextResponse.json({
          available: false,
          message: 'Unable to check availability - calendar access denied',
          error: 'Unauthorized',
        });
      }

      // Fallback: try checking events as backup
      return checkAvailabilityViaEvents(token, locationId, calendarId, dateTime);
    }

    const freeSlotsData = await freeSlotsResponse.json();
    
    // GHL free-slots API returns data in format: { "YYYY-MM-DD": [{ start: timestamp, end: timestamp }, ...] }
    // or sometimes: { slots: { "YYYY-MM-DD": [...] } }
    const slotsByDate = freeSlotsData[date] || freeSlotsData.slots?.[date] || freeSlotsData.data?.[date] || [];
    
    if (!Array.isArray(slotsByDate) || slotsByDate.length === 0) {
      return NextResponse.json({
        available: false,
        message: 'No available time slots for this date',
        slots: [],
      });
    }

    // Check if the selected time falls within any free slot
    const selectedTimeMs = dateTime.getTime();
    const isAvailable = slotsByDate.some((slot: any) => {
      const slotStart = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
      const slotEnd = typeof slot.end === 'number' ? slot.end : new Date(slot.end).getTime();
      
      // Check if selected time is within the slot (with 1 minute tolerance)
      return selectedTimeMs >= slotStart && selectedTimeMs <= slotEnd;
    });

    if (isAvailable) {
      return NextResponse.json({
        available: true,
        message: 'Time slot is available',
        slots: slotsByDate.length,
      });
    } else {
      // Find the nearest available slot
      let nearestSlot: any = null;
      let minDiff = Infinity;
      
      slotsByDate.forEach((slot: any) => {
        const slotStart = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
        const diff = Math.abs(slotStart - selectedTimeMs);
        if (diff < minDiff) {
          minDiff = diff;
          nearestSlot = slot;
        }
      });

      const nearestTime = nearestSlot 
        ? new Date(typeof nearestSlot.start === 'number' ? nearestSlot.start : nearestSlot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : null;

      return NextResponse.json({
        available: false,
        message: nearestTime 
          ? `Time slot not available. Nearest available: ${nearestTime}`
          : 'Time slot is not available',
        slots: slotsByDate.length,
        nearestSlot: nearestTime,
      });
    }
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
  dateTime: Date
) {
  try {
    const startTime = new Date(dateTime);
    startTime.setMinutes(startTime.getMinutes() - 30);
    const endTime = new Date(dateTime);
    endTime.setMinutes(endTime.getMinutes() + 30);

    const eventsResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/events?locationId=${locationId}&calendarId=${calendarId}&startTime=${encodeURIComponent(startTime.toISOString())}&endTime=${encodeURIComponent(endTime.toISOString())}`,
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
      
      const hasConflict = eventsArray.some((event: any) => {
        const eventStart = new Date(event.startTime || event.start).getTime();
        const eventEnd = new Date(event.endTime || event.end).getTime();
        return dateTime.getTime() >= eventStart && dateTime.getTime() <= eventEnd;
      });

      return NextResponse.json({
        available: !hasConflict,
        message: hasConflict 
          ? `Time slot conflicts with existing event(s)` 
          : 'Time slot appears available (fallback check)',
        eventCount: eventsArray.length,
        fallback: true,
      });
    }
  } catch (error) {
    console.error('Fallback availability check failed:', error);
  }

  return NextResponse.json({
    available: false,
    message: 'Unable to verify availability',
  });
}
