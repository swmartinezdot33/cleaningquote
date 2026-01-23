import { NextRequest, NextResponse } from 'next/server';
import { getContactById } from '@/lib/ghl/client';
import { ghlTokenExists } from '@/lib/kv';

/**
 * GET /api/contacts/get?contactId={contactId}
 * Fetch contact information from GHL by contact ID
 * Used to pre-fill survey form when opening in new tab
 * Public endpoint (no authentication required) - only reads contact data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: contactId',
          userMessage: 'Unable to load contact information.',
        },
        { status: 400 }
      );
    }

    // Check if GHL is configured
    const hasGHLToken = await ghlTokenExists().catch(() => false);

    if (!hasGHLToken) {
      // GHL not configured, return empty but don't fail
      return NextResponse.json(
        {
          success: false,
          message: 'GHL not configured',
          contact: null,
        }
      );
    }

    try {
      // Fetch contact from GHL
      const contact = await getContactById(contactId);

      return NextResponse.json({
        success: true,
        contact: {
          id: contact.id,
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email || '',
          phone: contact.phone || '',
          address1: contact.address1 || '',
          city: contact.city || '',
          state: contact.state || '',
          postalCode: contact.postalCode || '',
          country: contact.country || 'US',
        },
      });
    } catch (ghlError) {
      console.error('Error fetching contact from GHL:', ghlError);
      
      // If contact not found or other GHL error, return success: false but don't fail the request
      return NextResponse.json({
        success: false,
        message: ghlError instanceof Error ? ghlError.message : 'Failed to fetch contact',
        contact: null,
      });
    }
  } catch (error) {
    console.error('Error in get contact endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to get contact',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
