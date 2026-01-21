import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId, getGHLConfig } from '@/lib/kv';
import { createOrUpdateContact } from '@/lib/ghl/client';

/**
 * POST /api/service-area/out-of-service
 * Create a contact in GHL with out-of-service tags
 * 
 * Request body:
 * {
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   phone: string,
 *   address?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, address } = body;

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, phone' },
        { status: 400 }
      );
    }

    // Get GHL token and config
    const token = await getGHLToken();
    const locationId = await getGHLLocationId();
    const config = await getGHLConfig();

    if (!token) {
      return NextResponse.json(
        { error: 'GHL token not configured. Please set it in the admin settings.' },
        { status: 500 }
      );
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID not configured' },
        { status: 500 }
      );
    }

    // Create contact with out-of-service tags
    const contactId = await createOrUpdateContact(
      {
        firstName,
        lastName,
        email,
        phone,
        address1: address,
      },
      token,
      locationId,
      config?.outOfServiceTags
    );

    return NextResponse.json(
      {
        success: true,
        contactId,
        message: 'Out-of-service contact created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating out-of-service contact:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create out-of-service contact',
      },
      { status: 500 }
    );
  }
}
