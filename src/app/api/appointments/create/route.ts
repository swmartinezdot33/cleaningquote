import { NextRequest, NextResponse } from 'next/server';
import { createAppointment, makeGHLRequest } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig, getGHLLocationId } from '@/lib/kv';
import { getServiceName, getServiceTypeDisplayName } from '@/lib/pricing/format';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, date, time, timestamp, notes, type = 'appointment', serviceType, frequency } = body;

    console.log('Appointment creation request:', {
      type,
      hasContactId: !!contactId,
      date,
      time,
      hasNotes: !!notes,
    });

    // Validate required fields
    if (!contactId || !date || !time) {
      console.error('Missing required fields:', { contactId: !!contactId, date: !!date, time: !!time });
      return NextResponse.json(
        { 
          error: 'Missing required fields: contactId, date, time',
          userMessage: 'Please ensure all required fields are filled.',
        },
        { status: 400 }
      );
    }

    // Check if GHL is configured
    const hasGHLToken = await ghlTokenExists().catch(() => false);

    if (!hasGHLToken) {
      return NextResponse.json(
        {
          error:
            'GHL integration not configured. Please set up your GHL API token in admin settings.',
        },
        { status: 500 }
      );
    }

    // Get GHL config to retrieve calendar IDs
    const ghlConfig = await getGHLConfig();

    console.log('GHL Config:', {
      hasConfig: !!ghlConfig,
      appointmentCalendarId: ghlConfig?.appointmentCalendarId,
      callCalendarId: ghlConfig?.callCalendarId,
      appointmentUserId: ghlConfig?.appointmentUserId,
      callUserId: ghlConfig?.callUserId,
    });

    // Fetch contact information to get the contact name
    let contactName = '';
    try {
      const locationId = await getGHLLocationId();
      // Try with locationId in query string (for location-level tokens)
      const endpoint = locationId ? `/contacts/${contactId}?locationId=${locationId}` : `/contacts/${contactId}`;
      const contactResponse = await makeGHLRequest<{ contact?: { firstName?: string; lastName?: string; name?: string } } | { firstName?: string; lastName?: string; name?: string }>(
        endpoint,
        'GET'
      );
      
      // Handle both response formats: { contact: {...} } or direct contact object
      let contact: { firstName?: string; lastName?: string; name?: string } | undefined;
      if ('contact' in contactResponse && contactResponse.contact) {
        contact = contactResponse.contact;
      } else if ('firstName' in contactResponse || 'lastName' in contactResponse || 'name' in contactResponse) {
        contact = contactResponse as { firstName?: string; lastName?: string; name?: string };
      }
      
      if (contact) {
        if (contact.firstName || contact.lastName) {
          contactName = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
        } else if (contact.name) {
          contactName = contact.name;
        }
      }
    } catch (error) {
      console.warn('Failed to fetch contact name for appointment title:', error);
      // Continue without contact name - we'll use a generic title
    }

    // Determine service name from serviceType and frequency
    let serviceName = 'Cleaning Service';
    if (type === 'appointment' && (serviceType || frequency)) {
      if (frequency === 'one-time' || !frequency) {
        // One-time service
        if (serviceType) {
          serviceName = getServiceTypeDisplayName(serviceType);
        } else {
          serviceName = 'One-Time Service';
        }
      } else {
        // Recurring service
        serviceName = getServiceName(frequency);
      }
    }

    // Determine which calendar and user to use based on booking type
    let calendarId: string | undefined;
    let assignedTo: string | undefined;
    let title: string;
    let defaultNotes: string;

    if (type === 'call') {
      calendarId = ghlConfig?.callCalendarId;
      assignedTo = ghlConfig?.callUserId;
      title = contactName ? `Consultation Call - ${contactName}` : 'Consultation Call';
      defaultNotes = 'Consultation call scheduled through website quote form';
    } else {
      // default to appointment
      calendarId = ghlConfig?.appointmentCalendarId;
      assignedTo = ghlConfig?.appointmentUserId;
      title = contactName ? `${serviceName} - ${contactName}` : serviceName;
      defaultNotes = 'Appointment booked through website quote form';
    }

    console.log(`Selected ${type} configuration:`, {
      calendarId,
      assignedTo,
    });

    // Ensure calendar ID is configured
    if (!calendarId) {
      const fieldName = type === 'call' ? 'callCalendarId' : 'appointmentCalendarId';
      return NextResponse.json(
        {
          error: `GHL calendar not configured. Please set up the ${type === 'call' ? 'call' : 'appointment'} calendar in admin settings.`,
          missingField: fieldName,
          userMessage: `The ${type === 'call' ? 'call' : 'appointment'} calendar is not configured. Please contact support or try again later.`,
        },
        { status: 400 }
      );
    }

    // Ensure user is configured
    if (!assignedTo) {
      const fieldName = type === 'call' ? 'callUserId' : 'appointmentUserId';
      return NextResponse.json(
        {
          error: `GHL user not configured for ${type === 'call' ? 'call' : 'appointment'} calendar. Please select a user in admin settings.`,
          missingField: fieldName,
          userMessage: `The ${type === 'call' ? 'call' : 'appointment'} calendar is not properly configured. Please contact support.`,
        },
        { status: 400 }
      );
    }

    // Parse date and time
    // If timestamp is provided, use it directly (most accurate - matches availability API)
    // Otherwise, parse from date/time strings
    let startDateTime: Date;
    
    if (timestamp && typeof timestamp === 'number') {
      // Use the exact timestamp from the availability API - this ensures perfect match
      startDateTime = new Date(timestamp);
      console.log('Using provided timestamp for appointment:', {
        timestamp,
        isoString: startDateTime.toISOString(),
        local: startDateTime.toLocaleString(),
        utc: startDateTime.toUTCString(),
      });
    } else {
      // Fallback to parsing date/time strings (for backwards compatibility)
      // date format: YYYY-MM-DD, time format: HH:MM
      // The date/time comes from a UTC timestamp, so we need to parse it as UTC
      // Ensure time has seconds (HH:MM:00)
      const timeWithSeconds = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
      
      // Parse as UTC to avoid timezone conversion issues
      // Format: YYYY-MM-DDTHH:MM:SSZ (explicitly UTC)
      const dateTimeString = `${date}T${timeWithSeconds}Z`;
      startDateTime = new Date(dateTimeString);

      console.log('Parsing date/time strings for appointment:', {
        date,
        time,
        timeWithSeconds,
        dateTimeString,
        parsed: startDateTime.toISOString(),
        local: startDateTime.toLocaleString(),
        utc: startDateTime.toUTCString(),
        isValid: !isNaN(startDateTime.getTime()),
      });
    }

    if (isNaN(startDateTime.getTime())) {
      console.error('Invalid date/time format:', { date, time, timestamp });
      return NextResponse.json({ 
        error: 'Invalid date or time format',
        userMessage: 'The selected date or time format is invalid. Please try again.',
      }, { status: 400 });
    }

    // End time is 1 hour after start time
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    console.log('Creating appointment:', {
      contactId,
      calendarId,
      assignedTo,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      title,
    });

    // Create appointment in GHL with appropriate calendar ID and assigned user
    const appointment = await createAppointment({
      contactId,
      title,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      notes: notes || defaultNotes,
      calendarId,
      assignedTo, // Assign to the configured user
    });

    // Add appointment booked tags if configured
    if (ghlConfig?.appointmentBookedTags && Array.isArray(ghlConfig.appointmentBookedTags) && ghlConfig.appointmentBookedTags.length > 0) {
      try {
        const locationId = await getGHLLocationId();
        const endpoint = locationId ? `/contacts/${contactId}?locationId=${locationId}` : `/contacts/${contactId}`;
        
        // Fetch current contact to get existing tags
        const contactResponse = await makeGHLRequest<{ contact?: { tags?: string[] } } | { tags?: string[] }>(
          endpoint,
          'GET'
        );
        
        let currentTags: string[] = [];
        let contact: any;
        if ('contact' in contactResponse && contactResponse.contact) {
          contact = contactResponse.contact;
          currentTags = contact.tags || [];
        } else if ('tags' in contactResponse) {
          currentTags = (contactResponse as any).tags || [];
          contact = contactResponse;
        }
        
        // Combine current tags with appointment booked tags (remove duplicates)
        const allTags = Array.from(new Set([...currentTags, ...ghlConfig.appointmentBookedTags]));
        
        // Update contact with new tags
        await makeGHLRequest(
          endpoint,
          'PUT',
          { tags: allTags }
        );
        
        console.log('Added appointment booked tags to contact:', ghlConfig.appointmentBookedTags);
      } catch (error) {
        console.warn('Failed to add appointment booked tags:', error);
        // Continue anyway - the appointment was still created successfully
      }
    }

    return NextResponse.json({
      success: true,
      appointment,
      message: `${type === 'call' ? 'Call' : 'Appointment'} created successfully`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusMatch = errorMessage.match(/GHL API Error \((\d+)\)/);
    const ghlStatus = statusMatch ? parseInt(statusMatch[1], 10) : null;

    console.error('Error creating appointment:', {
      error: errorMessage,
      ghlStatus,
      stack: error instanceof Error ? (error as Error).stack : undefined,
    });

    // Check if it's a GHL API error
    if (errorMessage.includes('GHL API Error')) {
      // Provide user-friendly messages for common GHL errors
      if (errorMessage.includes("doesn't have any team members associated")) {
        return NextResponse.json(
          {
            error: 'Calendar Configuration Error',
            details: errorMessage,
            userMessage: 'This calendar is not properly configured. The calendar needs to have team members assigned in your GHL account. Please contact your administrator to configure the calendar settings in GHL, or try selecting a different calendar.',
          },
          { status: 500 }
        );
      }

      // LocationId / Location-Id not specified – sub-account needs Location-Id header
      if (errorMessage.includes('LocationId is not specified') || (errorMessage.includes('locationId') && errorMessage.includes('required')) || errorMessage.includes('Location-Id')) {
        return NextResponse.json(
          {
            error: 'GHL Location Not Specified',
            details: errorMessage,
            userMessage: 'Calendar connection needs a valid Location ID. Please set the Location ID in Admin Settings and ensure your GHL token has access to that location.',
          },
          { status: 500 }
        );
      }

      // "The token does not have access to this location" – token and Location ID must match the same sub-account
      if (errorMessage.includes('token does not have access to this location')) {
        return NextResponse.json(
          {
            error: 'GHL Token / Location Mismatch',
            details: errorMessage,
            userMessage:
              'The API token does not have access to the Location ID in your settings. Use a location-level (Private Integration) token created for the same sub-account: in GHL, open that sub-account → Settings → Integrations → API, create or copy a location-level token. Set that token and the Location ID (from that same sub-account’s Business Profile or API page) in Admin Settings.',
          },
          { status: 500 }
        );
      }

      // Other 403 / permission-style errors
      const isPermissionError =
        ghlStatus === 403 ||
        errorMessage.includes('403') ||
        errorMessage.includes('does not have access to this location') ||
        errorMessage.includes('token does not have access') ||
        (errorMessage.includes('permission') && (errorMessage.includes('location') || errorMessage.includes('valid')));
      if (isPermissionError) {
        return NextResponse.json(
          {
            error: 'GHL Access Denied',
            details: errorMessage,
            userMessage:
              'Your GHL connection does not have permission to create appointments for this location. In Admin Settings, please check: (1) API token has the calendars/events.write scope and is for this location, and (2) Location ID matches the sub-account that owns the appointment calendar.',
          },
          { status: 500 }
        );
      }

      // 422 / 400 validation: invalid assignedTo, calendar, or similar
      const lower = errorMessage.toLowerCase();
      const isUserAssignee = /assignedto|assigned_to|assignee|user\s+(not\s+)?found|invalid\s+user/.test(lower);
      const isCalendar = /calendar\s+(not\s+)?found|invalid\s+calendar|calendar\s+id/.test(lower);
      if (ghlStatus === 422 || ghlStatus === 400) {
        if (isUserAssignee) {
          return NextResponse.json(
            {
              error: 'Invalid assignee',
              details: errorMessage,
              userMessage: 'The user assigned to this calendar may not be valid. In Admin Settings, re-select the user for the appointment calendar and ensure that user is assigned to this calendar in GHL.',
            },
            { status: 400 }
          );
        }
        if (isCalendar) {
          return NextResponse.json(
            {
              error: 'Invalid calendar',
              details: errorMessage,
              userMessage: 'The appointment calendar may not be valid. In Admin Settings, re-select the calendar for appointments.',
            },
            { status: 400 }
          );
        }
      }

      // Handle unavailable time slot error
      if (errorMessage.includes('no longer available') || (errorMessage.includes('slot') && errorMessage.includes('available'))) {
        return NextResponse.json(
          {
            error: 'Time Slot Unavailable',
            details: errorMessage,
            userMessage: 'Sorry, the time slot you selected is no longer available. Please choose a different date and time.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to create appointment in GHL',
          details: errorMessage,
          userMessage: 'We encountered an issue creating your appointment. Please try again or contact support.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create appointment',
        details: errorMessage,
        userMessage: 'We encountered an issue creating your appointment. Please try again.',
      },
      { status: 500 }
    );
  }
}
