import { NextRequest, NextResponse } from 'next/server';
import { getCustomObjectById, getCustomObjectByQuoteId, getContactById } from '@/lib/ghl/client';
import { getBusinessNameForToolId, getLocationContactDetailsForToolId } from '@/lib/ghl/location-contact';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText, getSquareFootageRangeDisplay } from '@/lib/pricing/format';
import { QuoteInputs, QuoteRanges } from '@/lib/pricing/types';
import { getKV } from '@/lib/kv';
import { getSurveyQuestions, getSurveyDisplayLabels } from '@/lib/survey/manager';
import { createSupabaseServer } from '@/lib/supabase/server';

async function getQuoteLabelsFromSurvey(serviceType: string, frequency: string, toolId?: string): Promise<{
  serviceTypeLabel: string;
  frequencyLabel: string;
  serviceTypeOptions: Array<{ value: string; label: string }>;
  frequencyOptions: Array<{ value: string; label: string }>;
  serviceTypeLabels: Record<string, string>;
  frequencyLabels: Record<string, string>;
}> {
  try {
    const questions = await getSurveyQuestions(toolId);
    const { serviceTypeLabels, frequencyLabels } = getSurveyDisplayLabels(questions);
    const st = (serviceType || '').trim().toLowerCase();
    const freq = (frequency || '').trim().toLowerCase();
    const serviceTypeLabel = serviceTypeLabels[serviceType] || serviceTypeLabels[st] || '';
    const frequencyLabel = frequencyLabels[frequency] || frequencyLabels[freq] || frequencyLabels[freq === 'biweekly' ? 'bi-weekly' : freq] || '';
    const serviceTypeQ = questions.find(q => q.id === 'serviceType');
    const frequencyQ = questions.find(q => q.id === 'frequency');
    const serviceTypeOptions = serviceTypeQ?.options?.filter(o => o.value?.trim()).map(o => ({ value: o.value!.trim(), label: o.label || o.value! })) ?? [];
    const frequencyOptions = frequencyQ?.options?.filter(o => o.value?.trim()).map(o => ({ value: o.value!.trim(), label: o.label || o.value! })) ?? [];
    return { serviceTypeLabel, frequencyLabel, serviceTypeOptions, frequencyOptions, serviceTypeLabels, frequencyLabels };
  } catch {
    return { serviceTypeLabel: '', frequencyLabel: '', serviceTypeOptions: [], frequencyOptions: [], serviceTypeLabels: {}, frequencyLabels: {} };
  }
}

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

    // 1. Supabase (primary) – source of truth for quotes
    try {
      const supabase = createSupabaseServer();
      let row: { payload?: Record<string, unknown> } | null = (await supabase.from('quotes').select('*').eq('quote_id', quoteId).single()).data as any;
      if (!row) {
        row = (await supabase.from('quotes').select('*').eq('ghl_object_id', quoteId).single()).data as any;
      }
      if (row?.payload && (row.payload as any).ranges) {
        const payload = row.payload as any;
        const oneTimeTypes = ['move-in', 'move-out', 'deep'];
        const st = String(payload.serviceType || '').toLowerCase().trim();
        const normFreq = oneTimeTypes.includes(st) ? '' : (payload.frequency ?? '');
        const labels = await getQuoteLabelsFromSurvey(payload.serviceType, normFreq, payload.toolId);
        const businessName = payload.toolId ? await getBusinessNameForToolId(payload.toolId) : null;
        const locationContact = payload.toolId ? await getLocationContactDetailsForToolId(payload.toolId) : null;
        return NextResponse.json({
          ...payload,
          quoteId,
          serviceType: payload.serviceType,
          frequency: normFreq,
          ...labels,
          ...(businessName != null && { businessName }),
          ...(locationContact != null && { locationContact }),
        });
      }
    } catch (e) {
      // Supabase failed; fall through
    }

    // 2. KV cache (optional, fast path)
    try {
      const kv = getKV();
      const stored = await kv.get(`quote:${quoteId}`);
      const parsed = stored && (typeof stored === 'string' ? JSON.parse(stored) : stored);
      if (parsed && (parsed.ranges || parsed.ghlContactId)) {
        const oneTimeTypes = ['move-in', 'move-out', 'deep'];
        const st = String(parsed.serviceType || '').toLowerCase().trim();
        const normFreq = oneTimeTypes.includes(st) ? '' : (parsed.frequency ?? '');
        const labels = await getQuoteLabelsFromSurvey(parsed.serviceType, normFreq, parsed.toolId);
        const businessName = parsed.toolId ? await getBusinessNameForToolId(parsed.toolId) : null;
        const locationContact = parsed.toolId ? await getLocationContactDetailsForToolId(parsed.toolId) : null;
        return NextResponse.json({
          ...parsed,
          quoteId,
          serviceType: parsed.serviceType,
          frequency: normFreq,
          ...labels,
          ...(businessName != null && { businessName }),
          ...(locationContact != null && { locationContact }),
        });
      }
    } catch {
      // KV is optional cache; ignore
    }

    // 3. GHL (legacy) – fetch from KV and GHL in parallel
    const [kvResult, ghlResult] = await Promise.allSettled([
      // Try to fetch from KV (backup storage for tracking)
      (async () => {
        try {
          const kv = getKV();
          const key = `quote:${quoteId}`;
          const stored = await kv.get(key);
          if (stored && typeof stored === 'string') {
            return JSON.parse(stored);
          }
          if (stored) {
            return stored as any;
          }
          return null;
        } catch {
          return null;
        }
      })(),
      // Try to fetch Quote custom object from GHL
      (async () => {
        try {
          return await getCustomObjectById('quotes', quoteId);
        } catch (error) {
          try {
            return await getCustomObjectById('Quote', quoteId);
          } catch (secondError) {
            try {
              const quoteByQuoteId = await getCustomObjectByQuoteId(quoteId);
              if (quoteByQuoteId) return quoteByQuoteId;
            } catch {
              // Ignore search error
            }
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
          }
        } catch {
          // Ignore
        }
      }
      
      // Try with generated UUID if available
      if (!quoteDataFromKV && quoteIdField && quoteIdField !== quoteId) {
        try {
          const stored = await kv.get(`quote:${quoteIdField}`);
          if (stored && typeof stored === 'string') {
            quoteDataFromKV = JSON.parse(stored);
          }
        } catch {
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
    } else if (quoteObject?.contactId) {
      ghlContactId = quoteObject.contactId;
    }

    // If we have KV data but no GHL object, use KV data directly
    if (quoteDataFromKV && !quoteObject) {
      const oneTimeTypes = ['move-in', 'move-out', 'deep'];
      const st = String(quoteDataFromKV.serviceType || '').toLowerCase().trim();
      const normFreq = oneTimeTypes.includes(st) ? '' : (quoteDataFromKV.frequency ?? '');
      const labels = await getQuoteLabelsFromSurvey(quoteDataFromKV.serviceType, normFreq, quoteDataFromKV.toolId);
      const businessName = quoteDataFromKV.toolId ? await getBusinessNameForToolId(quoteDataFromKV.toolId) : null;
      const locationContact = quoteDataFromKV.toolId ? await getLocationContactDetailsForToolId(quoteDataFromKV.toolId) : null;
      return NextResponse.json({
        ...quoteDataFromKV,
        quoteId: quoteId,
        ghlContactId: ghlContactId || quoteDataFromKV.ghlContactId,
        serviceType: quoteDataFromKV.serviceType,
        frequency: normFreq,
        ...labels,
        ...(businessName != null && { businessName }),
        ...(locationContact != null && { locationContact }),
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

    // Reconstruct quote inputs from stored data. For quotes created through the form we always have full data (POST validates required fields). Missing data only occurs for legacy records or if something went wrong; in that case we do not recalculate with fake 0s.
    const hasRequired =
      squareFeet != null && Number.isFinite(squareFeet) && squareFeet > 0 &&
      bedrooms != null && bedrooms >= 0 &&
      fullBaths != null && fullBaths >= 0 &&
      halfBaths != null && halfBaths >= 0 &&
      people != null && people >= 0 &&
      sheddingPets != null && sheddingPets >= 0 &&
      condition != null && String(condition).trim() !== '';

    // Single inputs object: used for calcQuote when complete, and for response (no fake 0s in response when incomplete)
    const storedInputs: QuoteInputs = {
      squareFeet: squareFeet ?? 0,
      bedrooms: bedrooms ?? 0,
      fullBaths: fullBaths ?? 0,
      halfBaths: halfBaths ?? 0,
      people: people ?? 0,
      pets: sheddingPets ?? 0,
      sheddingPets: sheddingPets ?? 0,
      condition: condition ?? '',
      hasPreviousService,
      cleanedWithin3Months,
    };
    const [result, contactResult] = await Promise.allSettled([
      hasRequired ? calcQuote(storedInputs) : Promise.resolve({ outOfLimits: true, message: 'Quote data is incomplete. Original details are shown; price cannot be recalculated.', inputs: storedInputs }),
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

    const hasRanges = quoteResult && 'ranges' in quoteResult && quoteResult.ranges;
    if (!quoteResult || quoteResult.outOfLimits || !hasRanges) {
      // Return stored data as-is; missing numbers stay null so UI shows — (no fake 0s)
      const actualInputs: QuoteInputs = {
        squareFeet: squareFeet ?? 0,
        bedrooms: bedrooms ?? undefined,
        fullBaths: fullBaths ?? undefined,
        halfBaths: halfBaths ?? undefined,
        people: people ?? 0,
        pets: sheddingPets ?? 0,
        sheddingPets: sheddingPets ?? 0,
        condition: condition || '',
        hasPreviousService,
        cleanedWithin3Months,
      };
      const toolIdForName = quoteDataFromKV?.toolId ?? customFields.tool_id;
      const businessName = toolIdForName ? await getBusinessNameForToolId(String(toolIdForName)) : null;
      const locationContact = toolIdForName ? await getLocationContactDetailsForToolId(String(toolIdForName)) : null;
      return NextResponse.json({
        outOfLimits: true,
        message: quoteResult?.message ?? 'Quote data is incomplete. Original details are shown; price cannot be recalculated.',
        inputs: actualInputs,
        ranges: null,
        summaryText: null,
        smsText: null,
        ghlContactId: ghlContactId ?? null,
        quoteId: quoteId,
        contactData: contactResult.status === 'fulfilled' ? contactResult.value : null,
        serviceType: serviceType ?? '',
        frequency: frequency ?? '',
        ...(businessName != null && { businessName }),
        ...(locationContact != null && { locationContact }),
      });
    }

    const labels = await getQuoteLabelsFromSurvey(serviceType, frequency);
    const summaryLabels = { serviceTypeLabels: labels.serviceTypeLabels, frequencyLabels: labels.frequencyLabels };
    const squareFootageStored = customFields.square_footage ? String(customFields.square_footage).trim() : '';
    const squareFeetDisplayForNote =
      squareFootageStored && (squareFootageStored.includes('-') || squareFootageStored.toLowerCase().includes('less than'))
        ? squareFootageStored
        : getSquareFootageRangeDisplay(quoteResult.inputs?.squareFeet ?? 0);
    const ranges = hasRanges ? (quoteResult as { ranges: QuoteRanges }).ranges : null;
    if (!ranges) throw new Error('Quote ranges missing');
    const summaryText = generateSummaryText(
      { ...quoteResult, ranges },
      serviceType,
      frequency,
      squareFeetDisplayForNote,
      summaryLabels
    );
    const smsText = generateSmsText({ ...quoteResult, ranges }, summaryLabels);

    // Return inputs from GHL (no defaults — preserve stored values so UI shows — when missing)
    const actualInputs: QuoteInputs = {
      squareFeet: squareFeet ?? quoteResult.inputs?.squareFeet ?? 0,
      bedrooms: bedrooms ?? quoteResult.inputs?.bedrooms ?? 0,
      fullBaths: fullBaths ?? quoteResult.inputs?.fullBaths ?? 0,
      halfBaths: halfBaths ?? quoteResult.inputs?.halfBaths ?? 0,
      people: people ?? quoteResult.inputs?.people ?? 0,
      pets: sheddingPets ?? quoteResult.inputs?.pets ?? 0,
      sheddingPets: sheddingPets ?? quoteResult.inputs?.sheddingPets ?? 0,
      condition: condition || quoteResult.inputs?.condition || '',
      hasPreviousService: hasPreviousService ?? quoteResult.inputs?.hasPreviousService,
      cleanedWithin3Months: cleanedWithin3Months ?? quoteResult.inputs?.cleanedWithin3Months,
    };
    const toolIdForName = quoteDataFromKV?.toolId ?? customFields.tool_id;
    const businessName = toolIdForName ? await getBusinessNameForToolId(String(toolIdForName)) : null;
    const locationContact = toolIdForName ? await getLocationContactDetailsForToolId(String(toolIdForName)) : null;
    return NextResponse.json({
      outOfLimits: false,
      multiplier: quoteResult.multiplier,
      inputs: actualInputs,
      ranges,
      initialCleaningRequired: quoteResult.initialCleaningRequired,
      initialCleaningRecommended: quoteResult.initialCleaningRecommended,
      summaryText,
      smsText,
      ghlContactId: ghlContactId,
      quoteId: quoteId,
      contactData,
      serviceType: serviceType,
      frequency: frequency,
      ...labels,
      ...(businessName != null && { businessName }),
      ...(locationContact != null && { locationContact }),
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
