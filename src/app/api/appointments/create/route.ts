import { NextRequest, NextResponse } from 'next/server';
import { createAppointment } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, date, time, notes, type = 'appointment' } = body;

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

    // Determine which calendar and user to use based on booking type
    let calendarId: string | undefined;
    let assignedTo: string | undefined;
    let title: string;
    let defaultNotes: string;

    if (type === 'call') {
      calendarId = ghlConfig?.callCalendarId;
      assignedTo = ghlConfig?.callUserId;
      title = 'Consultation Call';
      defaultNotes = 'Consultation call scheduled through website quote form';
    } else {
      // default to appointment
      calendarId = ghlConfig?.appointmentCalendarId;
      assignedTo = ghlConfig?.appointmentUserId;
      title = 'Cleaning Service Appointment';
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
    // date format: YYYY-MM-DD, time format: HH:MM
    // Ensure time has seconds (HH:MM:00)
    const timeWithSeconds = time.includes(':') && time.split(':').length === 2 ? `${time}:00` : time;
    const dateTimeString = `${date}T${timeWithSeconds}`;
    const startDateTime = new Date(dateTimeString);

    console.log('Parsing date/time for appointment:', {
      date,
      time,
      timeWithSeconds,
      dateTimeString,
      parsed: startDateTime.toISOString(),
      local: startDateTime.toLocaleString(),
      isValid: !isNaN(startDateTime.getTime()),
    });

    if (isNaN(startDateTime.getTime())) {
      console.error('Invalid date/time format:', { date, time, dateTimeString });
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

    return NextResponse.json({
      success: true,
      appointment,
      message: `${type === 'call' ? 'Call' : 'Appointment'} created successfully`,
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Check if it's a GHL API error
    if (errorMessage.includes('GHL API Error')) {
      // Provide user-friendly messages for common GHL errors
      if (errorMessage.includes("doesn't have any team members associated")) {
        return NextResponse.json(
          {
            error: 'Calendar Configuration Error',
            details: 'The selected calendar in GHL needs to have team members assigned to it. Please configure the calendar in your GHL account settings.',
            userMessage: 'This calendar is not properly configured. The calendar needs to have team members assigned in your GHL account. Please contact your administrator to configure the calendar settings in GHL, or try selecting a different calendar.',
          },
          { status: 500 }
        );
      }
      
      // Handle unavailable time slot error
      if (errorMessage.includes('no longer available') || errorMessage.includes('slot') && errorMessage.includes('available')) {
        return NextResponse.json(
          {
            error: 'Time Slot Unavailable',
            details: 'The selected time slot has been booked by another customer or is no longer available.',
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
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        userMessage: 'We encountered an issue creating your appointment. Please try again.',
      },
      { status: 500 }
    );
  }
}
