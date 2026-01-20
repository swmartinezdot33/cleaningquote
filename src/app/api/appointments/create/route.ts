import { NextRequest, NextResponse } from 'next/server';
import { createAppointment } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, date, time, notes, type = 'appointment' } = body;

    // Validate required fields
    if (!contactId || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: contactId, date, time' },
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

    // Determine which calendar to use based on booking type
    let calendarId: string | undefined;
    let title: string;
    let defaultNotes: string;

    if (type === 'call') {
      calendarId = ghlConfig?.callCalendarId;
      title = 'Consultation Call';
      defaultNotes = 'Consultation call scheduled through website quote form';
    } else {
      // default to appointment
      calendarId = ghlConfig?.appointmentCalendarId;
      title = 'Cleaning Service Appointment';
      defaultNotes = 'Appointment booked through website quote form';
    }

    // Ensure calendar ID is configured
    if (!calendarId) {
      const fieldName = type === 'call' ? 'callCalendarId' : 'appointmentCalendarId';
      return NextResponse.json(
        {
          error: `GHL calendar not configured. Please set up the ${type === 'call' ? 'call' : 'appointment'} calendar in admin settings.`,
          missingField: fieldName,
        },
        { status: 400 }
      );
    }

    // Parse date and time
    // date format: YYYY-MM-DD, time format: HH:MM
    const startDateTime = new Date(`${date}T${time}:00`);

    if (isNaN(startDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date or time format' }, { status: 400 });
    }

    // End time is 1 hour after start time
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    // Create appointment in GHL with appropriate calendar ID
    const appointment = await createAppointment({
      contactId,
      title,
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      notes: notes || defaultNotes,
      calendarId,
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
      return NextResponse.json(
        {
          error: 'Failed to create appointment in GHL',
          details: errorMessage,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create appointment',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
