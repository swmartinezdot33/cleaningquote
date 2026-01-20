import { NextRequest, NextResponse } from 'next/server';
import { createAppointment } from '@/lib/ghl/client';
import { ghlTokenExists } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contactId, date, time, notes } = body;

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

    // Parse date and time
    // date format: YYYY-MM-DD, time format: HH:MM
    const startDateTime = new Date(`${date}T${time}:00`);

    if (isNaN(startDateTime.getTime())) {
      return NextResponse.json({ error: 'Invalid date or time format' }, { status: 400 });
    }

    // End time is 1 hour after start time
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    // Create appointment in GHL
    const appointment = await createAppointment({
      contactId,
      title: 'Cleaning Service Appointment',
      startTime: startDateTime.toISOString(),
      endTime: endDateTime.toISOString(),
      notes: notes || 'Appointment booked through website quote form',
    });

    return NextResponse.json({
      success: true,
      appointment,
      message: 'Appointment created successfully',
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
