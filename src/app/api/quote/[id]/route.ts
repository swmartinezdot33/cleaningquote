import { NextRequest, NextResponse } from 'next/server';
import { getCustomObjectById, getContactById } from '@/lib/ghl/client';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText } from '@/lib/pricing/format';
import { QuoteInputs } from '@/lib/pricing/types';
import { getKV } from '@/lib/kv';

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

    // Fetch from KV and GHL in parallel for faster response
    const [kvResult, ghlResult] = await Promise.allSettled([
      // Try to fetch from KV (backup storage for tracking)
      (async () => {
        try {
          const kv = getKV();
          const stored = await kv.get(`quote:${quoteId}`);
          if (stored && typeof stored === 'string') {
            const parsed = JSON.parse(stored);
            console.log('✅ Found quote data in KV storage');
            return parsed;
          }
          return null;
        } catch (kvError) {
          console.log('No quote data in KV:', kvError instanceof Error ? kvError.message : String(kvError));
          return null;
        }
      })(),
      // Try to fetch Quote custom object from GHL
      (async () => {
        try {
          return await getCustomObjectById('quotes', quoteId);
        } catch (error) {
          console.log('Failed with "quotes", trying "Quote" (capitalized)...');
          try {
            return await getCustomObjectById('Quote', quoteId);
          } catch (secondError) {
            console.log('Failed to fetch quote object from GHL');
            throw secondError;
          }
        }
      })(),
    ]);

    let quoteDataFromKV = kvResult.status === 'fulfilled' ? kvResult.value : null;
    const quoteObject = ghlResult.status === 'fulfilled' ? ghlResult.value : null;
    
    // If KV lookup failed but we have GHL object, try to find KV entry using stored IDs
    if (!quoteDataFromKV && quoteObject) {
      const kv = getKV();
      // Check if GHL object has stored IDs we can use
      const ghlObjectId = quoteObject.id;
      const quoteIdField = quoteObject.properties?.quote_id || quoteObject.customFields?.quote_id;
      
      // Try with GHL object ID
      if (ghlObjectId && ghlObjectId !== quoteId) {
        try {
          const stored = await kv.get(`quote:${ghlObjectId}`);
          if (stored && typeof stored === 'string') {
            quoteDataFromKV = JSON.parse(stored);
            console.log(`✅ Found quote data in KV storage with GHL object ID: ${ghlObjectId}`);
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // Try with generated UUID if available
      if (!quoteDataFromKV && quoteIdField && quoteIdField !== quoteId) {
        try {
          const stored = await kv.get(`quote:${quoteIdField}`);
          if (stored && typeof stored === 'string') {
            quoteDataFromKV = JSON.parse(stored);
            console.log(`✅ Found quote data in KV storage with generated UUID: ${quoteIdField}`);
          }
        } catch (e) {
          // Ignore
        }
      }
    }

    // If both failed, return error
    if (!quoteDataFromKV && !quoteObject) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Get ghlContactId from multiple sources (KV takes precedence, then GHL object)
    // This ensures buttons work even if GHL custom object doesn't have contactId set
    let ghlContactId: string | undefined = undefined;
    if (quoteDataFromKV?.ghlContactId) {
      ghlContactId = quoteDataFromKV.ghlContactId;
      console.log('✅ Found ghlContactId in KV storage:', ghlContactId);
    } else if (quoteObject?.contactId) {
      ghlContactId = quoteObject.contactId;
      console.log('✅ Found ghlContactId in GHL custom object:', ghlContactId);
    } else {
      // Debug: Log what we actually have
      console.warn('⚠️ No ghlContactId found in KV or GHL object - buttons will be disabled', {
        hasKVData: !!quoteDataFromKV,
        kvHasContactId: !!quoteDataFromKV?.ghlContactId,
        kvContactId: quoteDataFromKV?.ghlContactId,
        hasGHLObject: !!quoteObject,
        ghlObjectContactId: quoteObject?.contactId,
        quoteId,
      });
    }

    // If we have KV data but no GHL object, use KV data directly
    if (quoteDataFromKV && !quoteObject) {
      console.log('Using quote data from KV storage (GHL fetch failed)');
      return NextResponse.json({
        ...quoteDataFromKV,
        quoteId: quoteId,
        ghlContactId: ghlContactId || quoteDataFromKV.ghlContactId, // Ensure ghlContactId is included
      });
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
    const customFields = quoteObject?.properties || quoteObject?.customFields || {};

    // Extract data from custom fields
    // Handle type field - it's an array for MULTIPLE_OPTIONS
    const typeValue = customFields.type;
    let serviceType = Array.isArray(typeValue) ? typeValue[0] || '' : typeValue || '';
    
    // Reverse map serviceType from GHL schema format back to our format
    const serviceTypeReverseMap: Record<string, string> = {
      'general_cleaning': 'general',
      'initial_cleaning': 'initial',
      'deep_clean': 'deep',
      'move_in': 'move-in',
      'move_out': 'move-out',
      'recurring_cleaning': 'recurring',
    };
    if (serviceType && serviceTypeReverseMap[serviceType]) {
      serviceType = serviceTypeReverseMap[serviceType];
    }
    
    const squareFeet = parseInt(customFields.square_footage || '0', 10) || 0;
    const people = parseInt(customFields.people_in_home || '0', 10) || 0;
    const sheddingPets = parseInt(customFields.shedding_pets || '0', 10) || 0;
    const fullBaths = parseInt(customFields.full_baths || '0', 10) || 0;
    const halfBaths = parseInt(customFields.half_baths || '0', 10) || 0;
    const bedrooms = parseInt(customFields.bedrooms || '0', 10) || 0;
    const condition = customFields.current_condition || '';
    const hasPreviousService = customFields.cleaning_service_prior === 'yes' || customFields.cleaning_service_prior === 'Yes';
    const cleanedWithin3Months = customFields.cleaned_in_last_3_months === 'yes' || customFields.cleaned_in_last_3_months === 'Yes';
    let frequency = customFields.frequency || '';
    
    // Reverse map frequency from GHL schema format back to our format
    const frequencyReverseMap: Record<string, string> = {
      'weekly': 'weekly',
      'biweekly': 'bi-weekly',
      'monthly': 'four-week',
      'one_time': 'one-time',
    };
    if (frequency && frequencyReverseMap[frequency]) {
      frequency = frequencyReverseMap[frequency];
    }

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

    // Recalculate quote and fetch contact data in parallel for faster response
    const [result, contactResult] = await Promise.allSettled([
      // Recalculate quote to get ranges
      calcQuote(inputs),
      // Fetch contact data if contactId is available (use ghlContactId from above)
      ghlContactId
        ? getContactById(ghlContactId).then(contact => ({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            address: customFields.service_address || contact.address1,
          })).catch(error => {
            console.error('Failed to fetch contact data:', error);
            return null;
          })
        : Promise.resolve(null),
    ]);

    const quoteResult = result.status === 'fulfilled' ? result.value : null;
    const contactData = contactResult.status === 'fulfilled' ? contactResult.value : null;

    if (!quoteResult || quoteResult.outOfLimits || !quoteResult.ranges) {
      return NextResponse.json({
        outOfLimits: true,
        message: quoteResult?.message || 'Unable to calculate quote.',
      });
    }

    // Generate summary text
    const summaryText = generateSummaryText(
      { ...quoteResult, ranges: quoteResult.ranges },
      serviceType,
      frequency,
      customFields.square_footage // Pass original square footage string if it was a range
    );
    const smsText = generateSmsText({ ...quoteResult, ranges: quoteResult.ranges });

    return NextResponse.json({
      outOfLimits: false,
      multiplier: quoteResult.multiplier,
      inputs: quoteResult.inputs,
      ranges: quoteResult.ranges,
      initialCleaningRequired: quoteResult.initialCleaningRequired,
      initialCleaningRecommended: quoteResult.initialCleaningRecommended,
      summaryText,
      smsText,
      ghlContactId: ghlContactId, // Use the ghlContactId we found (from KV or GHL object)
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
