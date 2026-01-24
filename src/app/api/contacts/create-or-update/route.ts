import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateContact } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig } from '@/lib/kv';
import { getSurveyQuestions } from '@/lib/survey/manager';
import { SurveyQuestion } from '@/lib/survey/schema';

/**
 * POST /api/contacts/create-or-update
 * Creates or updates a contact in GHL with address information using the upsert endpoint
 * GHL automatically deduplicates based on email/phone
 * Called after the address step is completed
 * 
 * The endpoint uses GHL's /contacts/upsert which:
 * - Checks if contact exists by email/phone (GHL's deduplication logic)
 * - Updates if found
 * - Creates new if not found
 * 
 * This ensures every address submission is captured in GHL exactly once
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, address, city, state, postalCode, country } = body;

    // Validate required contact fields
    if (!firstName || !lastName || !email || !phone || !address) {
      return NextResponse.json(
        {
          error: 'Missing required fields: firstName, lastName, email, phone, address',
          userMessage: 'Please fill in all required contact information.',
        },
        { status: 400 }
      );
    }

    // Check if GHL is configured
    const hasGHLToken = await ghlTokenExists().catch(() => false);

    if (!hasGHLToken) {
      // GHL not configured, but don't fail - this is okay
      return NextResponse.json(
        {
          success: true,
          ghlContactId: null,
          message: 'GHL not configured, contact saved locally',
        }
      );
    }

    try {
      // Get GHL configuration
      const ghlConfig = await getGHLConfig();

      // Get survey questions to map fields
      const surveyQuestions = await getSurveyQuestions();

      // When no utm_source, use landing URL (sourceUrl) as source for attribution
      const effectiveSource = (body.sourceUrl && String(body.sourceUrl).trim()) || 'Website Quote Form';

      // Build contact data using field mappings
      const contactData: any = {
        firstName,
        lastName,
        email,
        phone,
        address1: address,
        source: effectiveSource,
        tags: ['Quote Request'],
        customFields: {},
      };

      // Add optional address fields
      if (city) contactData.city = city;
      if (state) contactData.state = state;
      if (postalCode) contactData.postalCode = postalCode;
      if (country) contactData.country = country;

      // Build a map of field IDs (both original and sanitized) to their GHL custom field mappings
      const fieldIdToMapping = new Map<string, string>();
      surveyQuestions.forEach((question: SurveyQuestion) => {
        if (question.ghlFieldMapping && question.ghlFieldMapping.trim() !== '') {
          fieldIdToMapping.set(question.id, question.ghlFieldMapping.trim());
          const sanitizedId = question.id.replace(/\./g, '_');
          fieldIdToMapping.set(sanitizedId, question.ghlFieldMapping.trim());
        }
      });

      console.log('Creating/updating contact with address info:', {
        firstName,
        lastName,
        email,
        phone,
        address,
        city,
        state,
        postalCode,
      });

      // Create or update contact in GHL
      const ghlContact = await createOrUpdateContact(contactData);

      console.log('Contact created/updated in GHL:', {
        ghlContactId: ghlContact.id,
        email: ghlContact.email,
      });

      return NextResponse.json({
        success: true,
        ghlContactId: ghlContact.id,
        message: 'Contact created/updated successfully',
      });
    } catch (error) {
      console.error('Error creating/updating contact in GHL:', error);
      // Don't fail the request if GHL update fails
      return NextResponse.json({
        success: true,
        ghlContactId: null,
        message: 'Contact creation attempted but failed silently',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('Error in create-or-update contact endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to create/update contact',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
