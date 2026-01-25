import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId, getGHLConfig } from '@/lib/kv';

/**
 * GET - Get available time slots for a date range
 * Query params: type ('appointment' | 'call'), from (timestamp in ms), to (timestamp in ms)
 * Returns available slots grouped by date
 */
export async function GET(request: NextRequest) {
  // Log immediately - this should always appear
  console.log('========================================');
  console.log('[calendar-availability/month] ROUTE CALLED');
  console.log('[calendar-availability/month] Timestamp:', new Date().toISOString());
  console.log('[calendar-availability/month] URL:', request.url);
  console.log('========================================');
  
  try {
    const token = await getGHLToken();
    const locationId = await getGHLLocationId();
    
    console.log('[calendar-availability/month] Starting request');
    console.log('[calendar-availability/month] Token exists:', !!token);
    console.log('[calendar-availability/month] LocationId exists:', !!locationId);
    
    if (!token || !locationId) {
      console.error('[calendar-availability/month] GHL not configured - token:', !!token, 'locationId:', !!locationId);
      return NextResponse.json(
        { error: 'GHL not configured', slots: {} },
        { status: 200 } // Return 200 with error so client can handle it
      );
    }

    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'appointment' or 'call'
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    console.log('[calendar-availability/month] Request params:', { type, fromParam, toParam });

    if (!type || !fromParam || !toParam) {
      console.error('[calendar-availability/month] Missing required params');
      return NextResponse.json(
        { error: 'type, from, and to are required', slots: {} },
        { status: 200 }
      );
    }

    const fromTime = parseInt(fromParam, 10);
    const toTime = parseInt(toParam, 10);

    if (isNaN(fromTime) || isNaN(toTime)) {
      console.error('[calendar-availability/month] Invalid timestamps');
      return NextResponse.json(
        { error: 'from and to must be valid timestamps in milliseconds', slots: {} },
        { status: 200 }
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

    console.log('[calendar-availability/month] Calendar ID:', calendarId, 'for type:', type);

    if (!calendarId) {
      console.error('[calendar-availability/month] Calendar not configured for type:', type);
      return NextResponse.json(
        { error: `Calendar not configured for ${type}`, slots: {} },
        { status: 200 }
      );
    }

    // Use GHL's free-slots endpoint
    // GHL API expects startDate and endDate. locationId should NOT be in query params.
    const ghlUrl = `https://services.leadconnectorhq.com/calendars/${calendarId}/free-slots?startDate=${fromTime}&endDate=${toTime}`;
    console.log('[calendar-availability/month] Calling GHL API:', ghlUrl);

    const freeSlotsResponse = await fetch(ghlUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
        'Location-Id': locationId,
      },
      cache: 'no-store',
    });

    console.log('[calendar-availability/month] GHL API response status:', freeSlotsResponse.status);

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
        return NextResponse.json({
          slots: {},
          message: 'No available time slots found for this calendar',
        });
      }

      if (freeSlotsResponse.status === 422) {
        // Check for specific 422 errors
        const errorMessage = errorData.message || errorText || '';
        const errorMessageStr = typeof errorMessage === 'string' ? errorMessage : (Array.isArray(errorMessage) ? errorMessage.join(', ') : JSON.stringify(errorMessage));
        
        if (errorMessageStr.includes('No users found') || errorMessageStr.includes('no users')) {
          return NextResponse.json({
            slots: {},
            error: 'Calendar has no users assigned in GHL. Users must be assigned to the calendar in GHL Calendar settings.',
            message: 'Calendar configuration error: No users assigned to calendar in GHL',
          });
        }
        // Generic 422 error
        return NextResponse.json({
          slots: {},
          error: errorMessageStr || 'Calendar configuration error',
          message: errorMessageStr || 'Please check calendar settings in GHL',
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
    console.log('[calendar-availability/month] GHL API response data keys:', Object.keys(freeSlotsData));
    console.log('[calendar-availability/month] GHL API response full data:', JSON.stringify(freeSlotsData));
    
    // GHL free-slots API returns data in format: { "YYYY-MM-DD": [{ start: timestamp, end: timestamp }, ...] }
    // or sometimes: { slots: { "YYYY-MM-DD": [...] } }
    // The response might be directly an object with date keys, or wrapped in a slots/data property
    let slots: any = {};
    
    // Check if response is already in date-keyed format
    if (freeSlotsData && typeof freeSlotsData === 'object' && !Array.isArray(freeSlotsData)) {
      // Check if it has date-like keys (YYYY-MM-DD format)
      const hasDateKeys = Object.keys(freeSlotsData).some(key => /^\d{4}-\d{2}-\d{2}$/.test(key));
      
      if (hasDateKeys) {
        // Response is already in { "YYYY-MM-DD": [...] } format
        slots = freeSlotsData;
        console.log('[calendar-availability/month] Response is in date-keyed format');
      } else if (freeSlotsData.slots) {
        // Response has a slots property
        slots = freeSlotsData.slots;
        console.log('[calendar-availability/month] Response has slots property');
      } else if (freeSlotsData.data) {
        // Response has a data property
        slots = freeSlotsData.data;
        console.log('[calendar-availability/month] Response has data property');
      } else {
        // Try the response itself
        slots = freeSlotsData;
        console.log('[calendar-availability/month] Using response directly');
      }
    }
    
    console.log('[calendar-availability/month] Processed slots object keys:', Object.keys(slots));
    console.log('[calendar-availability/month] Processed slots sample:', JSON.stringify(slots).substring(0, 1000));

    // Normalize the response format
    const normalizedSlots: Record<string, Array<{ start: number; end: number }>> = {};
    
    if (slots && typeof slots === 'object') {
      Object.keys(slots).forEach((dateKey) => {
        // Skip traceId and other non-date keys
        if (dateKey === 'traceId' || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          return;
        }
        
        const dateSlots = slots[dateKey];
        console.log(`[calendar-availability/month] Processing date ${dateKey}:`, typeof dateSlots);
        
        // GHL returns slots in format: { "2026-01-22": { slots: ["2026-01-22T12:00:00-05:00", ...] } }
        // OR sometimes: { "2026-01-22": [{ start: ..., end: ... }, ...] }
        let slotArray: any[] = [];
        
        if (Array.isArray(dateSlots)) {
          // Direct array format
          slotArray = dateSlots;
        } else if (dateSlots && typeof dateSlots === 'object' && dateSlots.slots && Array.isArray(dateSlots.slots)) {
          // Object with slots property
          slotArray = dateSlots.slots;
          console.log(`[calendar-availability/month] Extracted ${slotArray.length} slots from object for ${dateKey}`);
        } else if (dateSlots && typeof dateSlots === 'object') {
          // Try to find any array property
          const arrayProps = Object.values(dateSlots).filter(v => Array.isArray(v));
          if (arrayProps.length > 0) {
            slotArray = arrayProps[0] as any[];
            console.log(`[calendar-availability/month] Found array property with ${slotArray.length} items for ${dateKey}`);
          }
        }
        
        if (slotArray.length > 0) {
          normalizedSlots[dateKey] = slotArray.map((slot: any) => {
            // Handle different slot formats
            let start: number;
            let end: number;
            
            if (typeof slot === 'string') {
              // Slot is an ISO date string - assume 30 minute duration
              const startTime = new Date(slot).getTime();
              start = startTime;
              end = startTime + (30 * 60 * 1000); // 30 minutes
            } else if (typeof slot === 'object' && slot !== null) {
              // Slot is an object with start/end properties
              if (slot.start !== undefined) {
                start = typeof slot.start === 'number' ? slot.start : new Date(slot.start).getTime();
                end = typeof slot.end === 'number' ? slot.end : (slot.end ? new Date(slot.end).getTime() : start + (30 * 60 * 1000));
              } else {
                // Try to parse as ISO string
                const startTime = new Date(slot).getTime();
                start = startTime;
                end = startTime + (30 * 60 * 1000);
              }
            } else if (Array.isArray(slot) && slot.length >= 2) {
              // Slot might be [start, end] array
              start = typeof slot[0] === 'number' ? slot[0] : new Date(slot[0]).getTime();
              end = typeof slot[1] === 'number' ? slot[1] : new Date(slot[1]).getTime();
            } else {
              console.warn(`[calendar-availability/month] Unexpected slot format for ${dateKey}:`, slot);
              return null;
            }
            
            return { start, end };
          }).filter((slot: any) => slot !== null) as Array<{ start: number; end: number }>;
          
          console.log(`[calendar-availability/month] Normalized ${normalizedSlots[dateKey].length} slots for ${dateKey}`);
        } else {
          console.warn(`[calendar-availability/month] No valid slots array found for ${dateKey}`);
        }
      });
    } else {
      console.warn('[calendar-availability/month] Slots is not an object:', typeof slots, slots);
    }

    const totalCount = Object.values(normalizedSlots).reduce((sum, arr) => sum + arr.length, 0);
    console.log('[calendar-availability/month] Returning slots:', Object.keys(normalizedSlots).length, 'dates with', totalCount, 'total slots');
    
    if (totalCount === 0) {
      // Log extensively when no slots found
      console.error('========================================');
      console.error('[calendar-availability/month] NO SLOTS FOUND');
      console.error('[calendar-availability/month] Calendar ID:', calendarId);
      console.error('[calendar-availability/month] Type:', type);
      console.error('[calendar-availability/month] Date range:', new Date(fromTime).toISOString(), 'to', new Date(toTime).toISOString());
      console.error('[calendar-availability/month] GHL API URL:', ghlUrl);
      console.error('[calendar-availability/month] GHL response status:', freeSlotsResponse.status);
      console.error('[calendar-availability/month] Original GHL response:', JSON.stringify(freeSlotsData, null, 2));
      console.error('[calendar-availability/month] Processed slots:', JSON.stringify(slots, null, 2));
      console.error('[calendar-availability/month] Normalized slots:', JSON.stringify(normalizedSlots, null, 2));
      console.error('[calendar-availability/month] This usually means:');
      console.error('  1. Calendar has no availability/office hours configured for assigned users');
      console.error('  2. Calendar has no users assigned (even if selected in admin)');
      console.error('  3. No slots available in the requested date range');
      console.error('  4. Calendar settings in GHL need to be configured');
      console.error('========================================');
      
      // Return empty slots but with a helpful message
      return NextResponse.json({
        slots: {},
        count: 0,
        message: 'No available time slots found. Ensure the calendar has users assigned AND availability (office hours) configured in GHL.',
        warning: 'Calendar may need availability configuration',
        debug: {
          calendarId,
          type,
          dateRange: {
            from: new Date(fromTime).toISOString(),
            to: new Date(toTime).toISOString(),
          },
          ghlResponseStatus: freeSlotsResponse.status,
        },
      });
    }

    return NextResponse.json({
      slots: normalizedSlots,
      count: totalCount,
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
