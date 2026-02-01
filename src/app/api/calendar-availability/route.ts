import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId, getGHLConfig } from '@/lib/kv';
import { createSupabaseServer } from '@/lib/supabase/server';

async function resolveToolId(toolSlug: string | null, toolIdParam: string | null): Promise<string | undefined> {
  if (toolIdParam && typeof toolIdParam === 'string' && toolIdParam.trim()) return toolIdParam.trim();
  if (!toolSlug || typeof toolSlug !== 'string' || !toolSlug.trim()) return undefined;
  const supabase = createSupabaseServer();
  const { data } = await supabase.from('tools').select('id').eq('slug', toolSlug.trim()).maybeSingle();
  return (data as { id: string } | null)?.id ?? undefined;
}

/**
 * GET - Check calendar availability using GHL's free-slots API (tool-scoped).
 * Query params: type, date, time, toolSlug or toolId (required for multi-tenant)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const toolSlug = url.searchParams.get('toolSlug');
    const toolIdParam = url.searchParams.get('toolId');
    const toolId = await resolveToolId(toolSlug, toolIdParam);

    if (!toolId) {
      return NextResponse.json(
        { error: 'toolSlug or toolId is required' },
        { status: 400 }
      );
    }

    const token = await getGHLToken(toolId);
    const locationId = await getGHLLocationId(toolId);

    if (!token || !locationId) {
      return NextResponse.json(
        { error: 'GHL not configured' },
        { status: 400 }
      );
    }

    const type = url.searchParams.get('type'); // 'appointment' or 'call'
    const date = url.searchParams.get('date'); // YYYY-MM-DD
    const time = url.searchParams.get('time'); // HH:MM

    if (!type || !date || !time) {
      return NextResponse.json(
        { error: 'type, date, and time are required' },
        { status: 400 }
      );
    }

    const ghlConfig = await getGHLConfig(toolId);
    
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
    // Time format is HH:MM (e.g., "09:30"), need to append ":00" for seconds
    const timeWithSeconds = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    const dateTimeString = `${date}T${timeWithSeconds}`;
    
    // Create date in local timezone (GHL slots are in calendar's timezone)
    const dateTime = new Date(dateTimeString);
    if (isNaN(dateTime.getTime())) {
      console.error('[calendar-availability] Invalid date/time:', { date, time, dateTimeString });
      return NextResponse.json(
        { error: 'Invalid date or time format' },
        { status: 400 }
      );
    }
    
    console.log('[calendar-availability] Checking availability for:', {
      date,
      time,
      dateTimeString,
      parsed: dateTime.toISOString(),
      local: dateTime.toLocaleString(),
    });

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
    // GET /calendars/:calendarId/free-slots?startDate={ts}&endDate={ts}
    // Note: locationId should NOT be in query parameters for this endpoint
    const freeSlotsResponse = await fetch(
      `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?startDate=${fromTimestamp}&endDate=${toTimestamp}`,
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
        // Calendar might not have free slots configured or no availability
        return NextResponse.json({
          available: false,
          message: 'No available time slots found for this calendar',
        });
      }

      if (freeSlotsResponse.status === 422) {
        // Check for specific 422 errors
        const errorMessage = errorData.message || errorText || '';
        const errorMessageStr = typeof errorMessage === 'string' ? errorMessage : (Array.isArray(errorMessage) ? errorMessage.join(', ') : JSON.stringify(errorMessage));
        
        if (errorMessageStr.includes('No users found') || errorMessageStr.includes('no users')) {
          return NextResponse.json({
            available: false,
            message: 'Calendar has no users assigned in GHL. Users must be assigned to the calendar in GHL Calendar settings to enable booking.',
            error: 'No users assigned to calendar in GHL',
          });
        }
        // Generic 422 error
        return NextResponse.json({
          available: false,
          message: errorMessageStr || 'Calendar configuration error. Please check calendar settings in GHL.',
          error: errorData.error || 'Calendar configuration error',
        });
      }

      if (freeSlotsResponse.status === 401 || freeSlotsResponse.status === 403) {
        return NextResponse.json({
          available: false,
          message: 'Unable to check availability - calendar access denied',
          error: 'Unauthorized',
        });
      }

      // Log the error for debugging
      console.error(`GHL free-slots API failed (${freeSlotsResponse.status}):`, errorText);
      
      // Fallback: try checking events as backup
      // But mark it as unreliable since free-slots API failed
      return checkAvailabilityViaEvents(token, locationId, calendarId, dateTime);
    }

    const freeSlotsData = await freeSlotsResponse.json();
    console.log('[calendar-availability] GHL response for date', date, ':', JSON.stringify(freeSlotsData).substring(0, 500));
    
    // GHL free-slots API returns data in format: { "YYYY-MM-DD": { slots: ["ISO-string", ...] } }
    // or sometimes: { "YYYY-MM-DD": [{ start: timestamp, end: timestamp }, ...] }
    let slotsByDate: any[] = [];
    
    // Handle nested format: { "2026-01-22": { slots: [...] } }
    if (freeSlotsData[date]) {
      const dateData = freeSlotsData[date];
      if (Array.isArray(dateData)) {
        // Direct array format
        slotsByDate = dateData;
      } else if (dateData && typeof dateData === 'object' && dateData.slots && Array.isArray(dateData.slots)) {
        // Nested format with slots property - convert ISO strings to {start, end} objects
        slotsByDate = dateData.slots.map((slotStr: string) => {
          const start = new Date(slotStr).getTime();
          return { start, end: start + (30 * 60 * 1000) }; // 30 minute duration
        });
        console.log('[calendar-availability] Extracted', slotsByDate.length, 'slots from nested format');
      }
    } else if (freeSlotsData.slots?.[date]) {
      slotsByDate = freeSlotsData.slots[date];
    } else if (freeSlotsData.data?.[date]) {
      slotsByDate = freeSlotsData.data[date];
    }
    
    if (!Array.isArray(slotsByDate) || slotsByDate.length === 0) {
      console.log('[calendar-availability] No slots found for date', date);
      return NextResponse.json({
        available: false,
        message: 'No available time slots for this date',
        slots: [],
      });
    }

    console.log('[calendar-availability] Checking availability for', dateTime.toISOString(), 'against', slotsByDate.length, 'slots');
    
    // Check if the selected time falls within any free slot
    const selectedTimeMs = dateTime.getTime();
    const isAvailable = slotsByDate.some((slot: any) => {
      let slotStart: number;
      let slotEnd: number;
      
      if (typeof slot === 'string') {
        // Slot is an ISO date string
        slotStart = new Date(slot).getTime();
        slotEnd = slotStart + (30 * 60 * 1000); // 30 minute duration
      } else if (typeof slot === 'object' && slot !== null) {
        // Slot is an object with start/end properties
        slotStart = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
        slotEnd = typeof slot.end === 'number' ? slot.end : (slot.end ? new Date(slot.end).getTime() : slotStart + (30 * 60 * 1000));
      } else {
        return false;
      }
      
      // Check if selected time is within the slot (with 1 minute tolerance)
      const isWithinSlot = selectedTimeMs >= slotStart && selectedTimeMs <= slotEnd;
      console.log('[calendar-availability] Slot check:', {
        selected: new Date(selectedTimeMs).toISOString(),
        slotStart: new Date(slotStart).toISOString(),
        slotEnd: new Date(slotEnd).toISOString(),
        isWithinSlot,
      });
      return isWithinSlot;
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
        let slotStart: number;
        
        if (typeof slot === 'string') {
          slotStart = new Date(slot).getTime();
        } else if (typeof slot === 'object' && slot !== null) {
          slotStart = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
        } else {
          return;
        }
        
        const diff = Math.abs(slotStart - selectedTimeMs);
        if (diff < minDiff) {
          minDiff = diff;
          nearestSlot = slot;
        }
      });

      let nearestTime: string | null = null;
      if (nearestSlot) {
        let nearestStart: number;
        if (typeof nearestSlot === 'string') {
          nearestStart = new Date(nearestSlot).getTime();
        } else if (typeof nearestSlot === 'object' && nearestSlot !== null) {
          nearestStart = typeof nearestSlot.start === 'number' ? nearestSlot.start : new Date(nearestSlot.start).getTime();
        } else {
          nearestStart = 0;
        }
        nearestTime = new Date(nearestStart).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      }

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

      // When using fallback, be more conservative - only say available if no events found
      // and warn that this is not as reliable as free-slots API
      return NextResponse.json({
        available: !hasConflict && eventsArray.length === 0,
        message: hasConflict 
          ? `Time slot conflicts with existing event(s)` 
          : eventsArray.length === 0
            ? 'Time slot appears available (limited check - calendar configuration may affect availability)'
            : 'Unable to fully verify availability - calendar configuration check unavailable',
        eventCount: eventsArray.length,
        fallback: true,
        warning: 'Free-slots API unavailable - using limited event-based check',
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
