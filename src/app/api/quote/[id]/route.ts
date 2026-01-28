import { NextRequest, NextResponse } from 'next/server';
import { getCustomObjectById, getCustomObjectByQuoteId, getContactById } from '@/lib/ghl/client';
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

    // Our generated IDs are QT-YYMMDD-XXXXX. GHL record IDs are 24-char hex; /records/{id}
    // expects the GHL id, not our quote_id. For QT-* we prefer KV and skip GHL to avoid 404s.
    const isOurGeneratedId = /^QT-\d{6}-[A-Z0-9]{5}$/i.test(quoteId);

    if (isOurGeneratedId) {
      try {
        const kv = getKV();
        const stored = await kv.get(`quote:${quoteId}`);
        const parsed = stored && (typeof stored === 'string' ? JSON.parse(stored) : stored);
        if (parsed && (parsed.ranges || parsed.ghlContactId)) {
          const ghlContactId = parsed.ghlContactId;
          const oneTimeTypes = ['move-in', 'move-out', 'deep'];
          const st = String(parsed.serviceType || '').toLowerCase().trim();
          const normFreq = oneTimeTypes.includes(st) ? '' : (parsed.frequency ?? '');
          console.log('✅ Serving quote from KV (QT-* id, skipping GHL):', quoteId);
          return NextResponse.json({
            ...parsed,
            quoteId,
            ghlContactId: ghlContactId || parsed.ghlContactId,
            serviceType: parsed.serviceType,
            frequency: normFreq,
          });
        }
      } catch (e) {
        // KV failed; fall through to parallel fetch
      }
    }

    // Fetch from KV and GHL in parallel for faster response
    const [kvResult, ghlResult] = await Promise.allSettled([
      // Try to fetch from KV (backup storage for tracking)
      (async () => {
        try {
          const kv = getKV();
          const key = `quote:${quoteId}`;
          console.log(`🔍 Attempting KV lookup for key: ${key}`);
          const stored = await kv.get(key);
          console.log(`🔍 KV lookup result for ${key}:`, {
            found: !!stored,
            type: typeof stored,
            isString: typeof stored === 'string',
            length: stored ? (typeof stored === 'string' ? stored.length : 'not string') : 0,
          });
          if (stored && typeof stored === 'string') {
            const parsed = JSON.parse(stored);
            console.log(`✅ Found quote data in KV storage with key: ${key}`);
            return parsed;
          } else if (stored) {
            // KV might return the parsed object directly
            console.log(`✅ Found quote data in KV storage (already parsed) with key: ${key}`);
            return stored as any;
          }
          console.log(`⚠️ KV lookup returned null/undefined for key: ${key}`);
          return null;
        } catch (kvError) {
          const errorMsg = kvError instanceof Error ? kvError.message : String(kvError);
          // If KV is not configured, this is expected in local dev
          if (errorMsg.includes('KV_REST_API_URL') || errorMsg.includes('not configured')) {
            console.log('⚠️ KV storage not configured - skipping KV lookup (expected in local dev)');
          } else {
            console.log(`❌ KV lookup error for quote:${quoteId}:`, errorMsg);
          }
          return null;
        }
      })(),
      // Try to fetch Quote custom object from GHL
      (async () => {
        try {
          // First try direct ID lookup (might be GHL object ID)
          return await getCustomObjectById('quotes', quoteId);
        } catch (error) {
          console.log('Direct ID lookup failed, trying "Quote" (capitalized)...');
          try {
            return await getCustomObjectById('Quote', quoteId);
          } catch (secondError) {
            // If direct ID lookup fails, the quoteId might be a generated UUID
            // stored in the quote_id field. Try searching by that field.
            console.log('Direct ID lookup failed, quoteId might be a generated UUID in quote_id field');
            console.log('Attempting to search for quote by quote_id field...');
            
            try {
              const quoteByQuoteId = await getCustomObjectByQuoteId(quoteId);
              if (quoteByQuoteId) {
                console.log('✅ Found quote by searching quote_id field');
                return quoteByQuoteId;
              }
            } catch (searchError) {
              console.log('Search by quote_id field failed:', searchError instanceof Error ? searchError.message : String(searchError));
            }
            
            // If all GHL lookups failed, throw the original error
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

    // If both failed, return error with detailed logging
    if (!quoteDataFromKV && !quoteObject) {
      console.error('❌ Quote not found:', {
        quoteId,
        kvLookupSucceeded: kvResult.status === 'fulfilled',
        kvHasData: !!quoteDataFromKV,
        ghlLookupSucceeded: ghlResult.status === 'fulfilled',
        ghlHasData: !!quoteObject,
        kvError: kvResult.status === 'rejected' ? (kvResult.reason instanceof Error ? kvResult.reason.message : String(kvResult.reason)) : null,
        ghlError: ghlResult.status === 'rejected' ? (ghlResult.reason instanceof Error ? ghlResult.reason.message : String(ghlResult.reason)) : null,
        note: 'Quote may not exist, may have expired (30 day TTL), or may have been created before dual-ID storage was implemented',
      });
      
      return NextResponse.json(
        { 
          error: 'Quote not found',
          quoteId,
          details: process.env.NODE_ENV === 'development' ? {
            kvLookupFailed: kvResult.status === 'rejected',
            ghlLookupFailed: ghlResult.status === 'rejected',
          } : undefined,
        },
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
      const oneTimeTypes = ['move-in', 'move-out', 'deep'];
      const st = String(quoteDataFromKV.serviceType || '').toLowerCase().trim();
      const normFreq = oneTimeTypes.includes(st) ? '' : (quoteDataFromKV.frequency ?? '');
      console.log('Using quote data from KV storage (GHL fetch failed)');
      return NextResponse.json({
        ...quoteDataFromKV,
        quoteId: quoteId,
        ghlContactId: ghlContactId || quoteDataFromKV.ghlContactId,
        serviceType: quoteDataFromKV.serviceType,
        frequency: normFreq,
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

    // Debug: Log custom fields to see what we're getting from GHL
    console.log('🔍 Custom fields from GHL:', {
      square_footage: customFields.square_footage,
      bedrooms: customFields.bedrooms,
      full_baths: customFields.full_baths,
      half_baths: customFields.half_baths,
      people_in_home: customFields.people_in_home,
      shedding_pets: customFields.shedding_pets,
      allFields: Object.keys(customFields),
    });

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

    // Parse numeric fields - use null if field doesn't exist, otherwise parse the value
    const parseNumericField = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = parseInt(String(value), 10);
      return isNaN(parsed) ? null : parsed;
    };
    
    const squareFeet = parseNumericField(customFields.square_footage);
    const people = parseNumericField(customFields.people_in_home);
    const sheddingPets = parseNumericField(customFields.shedding_pets);
    const fullBaths = parseNumericField(customFields.full_baths);
    const halfBaths = parseNumericField(customFields.half_baths);
    const bedrooms = parseNumericField(customFields.bedrooms);
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
    // For one-time types, never return a recurring frequency (so quote summary shows correct selection)
    const oneTimeTypes = ['move-in', 'move-out', 'deep'];
    if (oneTimeTypes.includes(serviceType)) {
      frequency = '';
    }

    // Reconstruct quote inputs - use 0 as fallback for required numeric fields if null
    const inputs: QuoteInputs = {
      squareFeet: squareFeet ?? 1500, // Default to 1500 if not provided
      bedrooms: bedrooms ?? 0,
      fullBaths: fullBaths ?? 0,
      halfBaths: halfBaths ?? 0,
      people: people ?? 0,
      pets: sheddingPets ?? 0, // Using sheddingPets as pets
      sheddingPets: sheddingPets ?? 0,
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

    // Return inputs with actual values from GHL (not recalculated ones) to preserve original form data
    const actualInputs: QuoteInputs = {
      squareFeet: squareFeet ?? quoteResult.inputs?.squareFeet ?? 1500,
      bedrooms: bedrooms ?? quoteResult.inputs?.bedrooms ?? 0,
      fullBaths: fullBaths ?? quoteResult.inputs?.fullBaths ?? 0,
      halfBaths: halfBaths ?? quoteResult.inputs?.halfBaths ?? 0,
      people: people ?? quoteResult.inputs?.people ?? 0,
      pets: sheddingPets ?? quoteResult.inputs?.pets ?? 0,
      sheddingPets: sheddingPets ?? quoteResult.inputs?.sheddingPets ?? 0,
      condition: condition || quoteResult.inputs?.condition,
      hasPreviousService: hasPreviousService ?? quoteResult.inputs?.hasPreviousService,
      cleanedWithin3Months: cleanedWithin3Months ?? quoteResult.inputs?.cleanedWithin3Months,
    };
    
    return NextResponse.json({
      outOfLimits: false,
      multiplier: quoteResult.multiplier,
      inputs: actualInputs,
      ranges: quoteResult.ranges,
      initialCleaningRequired: quoteResult.initialCleaningRequired,
      initialCleaningRecommended: quoteResult.initialCleaningRecommended,
      summaryText,
      smsText,
      ghlContactId: ghlContactId,
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
