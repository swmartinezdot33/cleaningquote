import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId, getGHLConfig } from '@/lib/kv';
import { createOrUpdateContact } from '@/lib/ghl/client';
import { parseAddress } from '@/lib/utils/parseAddress';

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
    const { firstName, lastName, email, phone, address, address2 } = body;

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

    // Combine address and address2 if address2 exists (GHL only has one address line)
    const fullAddress = address2 
      ? `${address || ''} ${address2}`.trim()
      : address || '';

    // Parse address if provided
    let parsedStreetAddress = fullAddress;
    let parsedCity = '';
    let parsedState = '';
    let parsedPostalCode = '';

    if (fullAddress) {
      const parsed = parseAddress(fullAddress);
      parsedStreetAddress = parsed.streetAddress || fullAddress;
      parsedCity = parsed.city || '';
      parsedState = parsed.state || '';
      parsedPostalCode = parsed.zipCode || '';
    }

    // Create contact with out-of-service tags
    const contactData: any = {
      firstName,
      lastName,
      email,
      phone,
    };

    if (parsedStreetAddress) contactData.address1 = parsedStreetAddress;
    if (parsedCity) contactData.city = parsedCity;
    if (parsedState) contactData.state = parsedState;
    if (parsedPostalCode) contactData.postalCode = parsedPostalCode;

    const contactId = await createOrUpdateContact(
      contactData,
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
