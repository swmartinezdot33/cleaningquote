import { NextRequest, NextResponse } from 'next/server';
import { getCustomObjectById, getContactById } from '@/lib/ghl/client';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText } from '@/lib/pricing/format';
import { QuoteInputs } from '@/lib/pricing/types';

/**
 * GET /api/quote/[id]
 * Fetch quote data from GHL Quote custom object
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      );
    }

    // Fetch Quote custom object from GHL
    // Try both 'quotes' and 'Quote' object type names
    let quoteObject;
    try {
      quoteObject = await getCustomObjectById('quotes', quoteId);
    } catch (error) {
      console.log('Failed with "quotes", trying "Quote" (capitalized)...');
      try {
        quoteObject = await getCustomObjectById('Quote', quoteId);
      } catch (secondError) {
        console.error('Failed to fetch quote object from GHL:', error, secondError);
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        );
      }
    }

    // GHL returns custom fields in properties object, not customFields
    // Based on testing, the response structure is: { properties: { quote_id: ..., type: [...] } }
    if (!quoteObject || (!quoteObject.properties && !quoteObject.customFields)) {
      return NextResponse.json(
        { error: 'Quote data not found' },
        { status: 404 }
      );
    }

    // GHL returns custom fields in properties object
    // Based on testing, the response structure is: { properties: { quote_id: ..., type: [...] } }
    const customFields = quoteObject.properties || quoteObject.customFields || {};

    // Extract data from custom fields
    // Handle type field - it's an array for MULTIPLE_OPTIONS
    const typeValue = customFields.type;
    const serviceType = Array.isArray(typeValue) ? typeValue[0] || '' : typeValue || '';
    
    const squareFeet = parseInt(customFields.square_footage || '0', 10) || 0;
    const people = parseInt(customFields.people_in_home || '0', 10) || 0;
    const sheddingPets = parseInt(customFields.shedding_pets || '0', 10) || 0;
    const fullBaths = parseInt(customFields.full_baths || '0', 10) || 0;
    const halfBaths = parseInt(customFields.half_baths || '0', 10) || 0;
    const bedrooms = parseInt(customFields.bedrooms || '0', 10) || 0;
    const condition = customFields.current_condition || '';
    const hasPreviousService = customFields.cleaning_service_prior === 'yes' || customFields.cleaning_service_prior === 'Yes';
    const cleanedWithin3Months = customFields.cleaned_in_last_3_months === 'yes' || customFields.cleaned_in_last_3_months === 'Yes';
    const frequency = customFields.frequency || '';

    // Reconstruct quote inputs
    const inputs: QuoteInputs = {
      squareFeet,
      bedrooms,
      fullBaths,
      halfBaths,
      people,
      pets: sheddingPets, // Using sheddingPets as pets
      sheddingPets,
      condition,
      hasPreviousService,
      cleanedWithin3Months,
    };

    // Recalculate quote to get ranges
    const result = await calcQuote(inputs);

    if (result.outOfLimits || !result.ranges) {
      return NextResponse.json({
        outOfLimits: true,
        message: result.message || 'Unable to calculate quote.',
      });
    }

    // Generate summary text
    const summaryText = generateSummaryText(
      { ...result, ranges: result.ranges },
      serviceType,
      frequency,
      customFields.square_footage // Pass original square footage string if it was a range
    );
    const smsText = generateSmsText({ ...result, ranges: result.ranges });

    // Fetch contact data if contactId is available
    let contactData = null;
    if (quoteObject.contactId) {
      try {
        const contact = await getContactById(quoteObject.contactId);
        contactData = {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          address: customFields.service_address || contact.address1,
        };
      } catch (error) {
        console.error('Failed to fetch contact data:', error);
        // Continue without contact data
      }
    }

    return NextResponse.json({
      outOfLimits: false,
      multiplier: result.multiplier,
      inputs: result.inputs,
      ranges: result.ranges,
      initialCleaningRequired: result.initialCleaningRequired,
      initialCleaningRecommended: result.initialCleaningRecommended,
      summaryText,
      smsText,
      ghlContactId: quoteObject.contactId,
      quoteId: quoteId,
      contactData,
      serviceType: serviceType,
      frequency: frequency,
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: 'Failed to fetch quote',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
