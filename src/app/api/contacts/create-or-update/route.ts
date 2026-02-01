import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdateContact, updateContact } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig, getGHLToken, getGHLLocationId } from '@/lib/kv';
import { getSurveyQuestions } from '@/lib/survey/manager';
import { SurveyQuestion } from '@/lib/survey/schema';
import { parseAddress } from '@/lib/utils/parseAddress';

/**
 * POST /api/contacts/create-or-update
 * - After email step (no address): creates contact with name, phone, email only. Returns ghlContactId.
 * - At address step with existing ghlContactId: updates that contact with address (PUT by id).
 * - At address step without ghlContactId: creates/updates by upsert (email/phone) with address.
 * - toolId: When provided (multi-tenant), uses the same GHL location as the quote flow for consistent association.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, address, address2, city, state, postalCode, country, ghlContactId, toolId } = body;

    // Always require name, email, phone. Address is optional (required only when updating with address).
    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        {
          error: 'Missing required fields: firstName, lastName, email, phone',
          userMessage: 'Please fill in all required contact information.',
        },
        { status: 400 }
      );
    }

    const hasAddress = Boolean(address && String(address).trim());
    if (!hasAddress && ghlContactId) {
      return NextResponse.json(
        { error: 'When ghlContactId is provided, address is required for update.', userMessage: 'Address is required.' },
        { status: 400 }
      );
    }

    const resolvedToolId = typeof toolId === 'string' && toolId.trim() ? toolId.trim() : undefined;
    const hasGHLToken = await ghlTokenExists(resolvedToolId).catch(() => false);
    if (!hasGHLToken) {
      return NextResponse.json(
        { success: true, ghlContactId: null, message: 'GHL not configured, contact saved locally' }
      );
    }

    try {
      const [ghlToken, ghlLocationId] = await Promise.all([
        getGHLToken(resolvedToolId),
        getGHLLocationId(resolvedToolId),
      ]);
      const ghlConfig = await getGHLConfig(resolvedToolId);
      const surveyQuestions = await getSurveyQuestions(resolvedToolId);
      const utmSource = body.utm_source && String(body.utm_source).trim();
      const effectiveSource = utmSource || 'Website Quote Form';

      const baseContactData: any = {
        firstName,
        lastName,
        email,
        phone,
        source: effectiveSource,
        tags: ['Quote Request'],
        customFields: {},
      };

      let ghlContact: { id: string; email?: string };

      if (hasAddress && ghlContactId) {
        // Update existing contact (created after email step) with address
        const fullAddress = address2 ? `${address} ${address2}`.trim() : address;
        let parsedStreetAddress = fullAddress;
        let parsedCity = city || '';
        let parsedState = state || '';
        let parsedPostalCode = postalCode || '';
        if (fullAddress && (!city || !state || !postalCode)) {
          const parsed = parseAddress(fullAddress);
          parsedStreetAddress = parsed.streetAddress || fullAddress;
          parsedCity = city || parsed.city || '';
          parsedState = state || parsed.state || '';
          parsedPostalCode = postalCode || parsed.zipCode || '';
        }
        const updateData = {
          ...baseContactData,
          address1: parsedStreetAddress,
          ...(parsedCity && { city: parsedCity }),
          ...(parsedState && { state: parsedState }),
          ...(parsedPostalCode && { postalCode: parsedPostalCode }),
          ...(country && { country: country }),
        };
        ghlContact = await updateContact(ghlContactId, updateData, ghlToken ?? undefined, ghlLocationId ?? undefined);
        console.log('Contact updated in GHL with address:', { ghlContactId: ghlContact.id });
      } else if (hasAddress) {
        // No existing contact: create/update by upsert with address
        const fullAddress = address2 ? `${address} ${address2}`.trim() : address;
        let parsedStreetAddress = fullAddress;
        let parsedCity = city || '';
        let parsedState = state || '';
        let parsedPostalCode = postalCode || '';
        if (fullAddress && (!city || !state || !postalCode)) {
          const parsed = parseAddress(fullAddress);
          parsedStreetAddress = parsed.streetAddress || fullAddress;
          parsedCity = city || parsed.city || '';
          parsedState = state || parsed.state || '';
          parsedPostalCode = postalCode || parsed.zipCode || '';
        }
        const contactData = {
          ...baseContactData,
          address1: parsedStreetAddress,
          ...(parsedCity && { city: parsedCity }),
          ...(parsedState && { state: parsedState }),
          ...(parsedPostalCode && { postalCode: parsedPostalCode }),
          ...(country && { country: country }),
        };
        ghlContact = await createOrUpdateContact(contactData, ghlToken ?? undefined, ghlLocationId ?? undefined);
        console.log('Contact created/updated in GHL (with address):', { ghlContactId: ghlContact.id });
      } else {
        // After email step: create contact with name, phone, email only (upsert finds existing by email/phone)
        ghlContact = await createOrUpdateContact(baseContactData, ghlToken ?? undefined, ghlLocationId ?? undefined);
        console.log('Contact created in GHL (after email step):', { ghlContactId: ghlContact.id });
      }

      return NextResponse.json({
        success: true,
        ghlContactId: ghlContact.id,
        message: 'Contact created/updated successfully',
      });
    } catch (error) {
      console.error('Error creating/updating contact in GHL:', error);
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
      { error: 'Failed to create/update contact', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
