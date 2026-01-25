import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/security/auth';
import { createOrUpdateContact, createNote } from '@/lib/ghl/client';
import { getGHLLocationId, ghlTokenExists } from '@/lib/kv';

/**
 * POST /api/admin/ghl-notes-test
 * Comprehensive test for note creation functionality
 * 
 * This endpoint:
 * 1. Creates or updates a test contact
 * 2. Creates a note on that contact
 * 3. Verifies the note was created successfully
 */
export async function POST(request: NextRequest) {
  try {
    // Secure authentication
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    // Check if GHL is configured
    const hasGHLToken = await ghlTokenExists().catch(() => false);
    if (!hasGHLToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'GHL API token not configured. Please set it in the admin settings.',
        },
        { status: 400 }
      );
    }

    const locationId = await getGHLLocationId();
    if (!locationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Location ID is required. Please configure it in the admin settings.',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { contactId, testNote } = body;

    // Step 1: Create or get a test contact
    let testContactId = contactId;
    let contactCreated = false;

    if (!testContactId) {
      console.log('📝 Creating test contact for note testing...');
      const timestamp = Date.now();
      const testContact = await createOrUpdateContact({
        firstName: 'Note',
        lastName: `Test ${timestamp}`,
        email: `note-test-${timestamp}@example.com`,
        phone: `+1555${timestamp.toString().slice(-7)}`, // Unique phone number
        source: 'Note Creation Test',
      }, undefined, locationId);

      testContactId = testContact.id;
      contactCreated = true;
      console.log('✅ Test contact created:', {
        contactId: testContactId,
        name: `${testContact.firstName} ${testContact.lastName}`,
      });
    } else {
      console.log('📝 Using provided contact ID for note testing:', testContactId);
    }

    // Step 2: Create a note on the contact
    const noteBody = testNote || `Test note created at ${new Date().toISOString()}\n\nThis is a test note to verify the note creation endpoint is working correctly.`;
    
    console.log('📝 Creating note on contact...', {
      contactId: testContactId,
      noteLength: noteBody.length,
    });

    let noteResult;
    try {
      noteResult = await createNote(
        {
          contactId: testContactId,
          body: noteBody,
        },
        locationId
      );

      console.log('✅ Note created successfully:', {
        noteId: noteResult.id,
        contactId: testContactId,
        bodyLength: noteResult.body?.length || 0,
      });

      return NextResponse.json({
        success: true,
        message: 'Note creation test passed!',
        results: {
          contact: {
            id: testContactId,
            created: contactCreated,
          },
          note: {
            id: noteResult.id,
            contactId: noteResult.contactId,
            body: noteResult.body,
            createdAt: noteResult.createdAt,
          },
        },
        testDetails: {
          endpoint: `/contacts/${testContactId}/notes`,
          method: 'POST',
          locationId,
        },
      });
    } catch (noteError) {
      const errorMessage = noteError instanceof Error ? noteError.message : String(noteError);
      console.error('❌ Note creation failed:', {
        error: errorMessage,
        contactId: testContactId,
        locationId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Note creation failed',
          details: errorMessage,
          troubleshooting: {
            contactId: testContactId,
            locationId,
            endpoint: `/contacts/${testContactId}/notes`,
            suggestions: [
              'Verify your API token has contacts.write scope',
              'Ensure the contact exists in GHL',
              'Check that locationId is correct',
              'Verify the endpoint format matches GHL API v2 standards',
            ],
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Note test endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/ghl-notes-test
 * Get information about the note creation test
 */
export async function GET(request: NextRequest) {
  try {
    // Secure authentication
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const hasGHLToken = await ghlTokenExists().catch(() => false);
    const locationId = await getGHLLocationId().catch(() => null);

    return NextResponse.json({
      endpoint: '/api/admin/ghl-notes-test',
      method: 'POST',
      description: 'Test note creation functionality',
      usage: {
        createNewContact: {
          method: 'POST',
          body: {
            testNote: 'Optional custom note text',
          },
        },
        useExistingContact: {
          method: 'POST',
          body: {
            contactId: 'existing-contact-id',
            testNote: 'Optional custom note text',
          },
        },
      },
      configuration: {
        hasGHLToken,
        hasLocationId: !!locationId,
        locationId: locationId || 'Not configured',
      },
      expectedResponse: {
        success: true,
        results: {
          contact: {
            id: 'contact-id',
            created: true,
          },
          note: {
            id: 'note-id',
            contactId: 'contact-id',
            body: 'Note content',
            createdAt: 'ISO timestamp',
          },
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get test information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
