import { NextRequest, NextResponse } from 'next/server';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText } from '@/lib/pricing/format';
import { QuoteInputs, QuoteRanges } from '@/lib/pricing/types';
import { createOrUpdateContact, createOpportunity, createNote } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig, getSurveyQuestions, SurveyQuestion } from '@/lib/kv';

/**
 * Helper to get the selected quote range based on service type and frequency
 */
function getSelectedQuoteRange(ranges: QuoteRanges, serviceType: string, frequency: string): { low: number; high: number } | null {
  if (frequency === 'weekly') {
    return ranges.weekly;
  } else if (frequency === 'bi-weekly') {
    return ranges.biWeekly;
  } else if (frequency === 'monthly') {
    return ranges.fourWeek;
  } else if (serviceType === 'initial' && frequency === 'one-time') {
    return ranges.initial;
  } else if (serviceType === 'deep' && frequency === 'one-time') {
    return ranges.deep;
  } else if (serviceType === 'general' && frequency === 'one-time') {
    return ranges.general;
  } else if (serviceType === 'move-in' && frequency === 'one-time') {
    return ranges.moveInOutBasic;
  } else if (serviceType === 'move-out' && frequency === 'one-time') {
    return ranges.moveInOutFull;
  }
  return null;
}

/**
 * Helper to get the selected quote price based on service type and frequency
 */
function getSelectedQuotePrice(ranges: any, serviceType: string, frequency: string): number {
  if (frequency === 'weekly') {
    return Math.round((ranges.weekly.low + ranges.weekly.high) / 2);
  } else if (frequency === 'bi-weekly') {
    return Math.round((ranges.biWeekly.low + ranges.biWeekly.high) / 2);
  } else if (frequency === 'monthly') {
    return Math.round((ranges.fourWeek.low + ranges.fourWeek.high) / 2);
  } else if (serviceType === 'initial' && frequency === 'one-time') {
    return Math.round((ranges.initial.low + ranges.initial.high) / 2);
  } else if (serviceType === 'deep' && frequency === 'one-time') {
    return Math.round((ranges.deep.low + ranges.deep.high) / 2);
  } else if (serviceType === 'general' && frequency === 'one-time') {
    return Math.round((ranges.general.low + ranges.general.high) / 2);
  } else if (serviceType === 'move-in' && frequency === 'one-time') {
    return Math.round((ranges.moveInOutBasic.low + ranges.moveInOutBasic.high) / 2);
  } else if (serviceType === 'move-out' && frequency === 'one-time') {
    return Math.round((ranges.moveInOutFull.low + ranges.moveInOutFull.high) / 2);
  }

  // Fallback to the high end of general
  return ranges.general.high;
}

/**
 * Convert square footage range to upper bound minus 1 (for accurate pricing tier matching)
 */
function convertSquareFootageRange(range: string): number {
  if (!range) return 1500; // Default fallback
  
  const cleaned = range.trim();
  
  // Handle "Less Than 1500" or "Less Than1500" format
  if (cleaned.toLowerCase().includes('less than')) {
    const match = cleaned.match(/\d+/);
    if (match) {
      const max = parseInt(match[0], 10);
      return max - 1; // Use upper bound - 1 for matching
    }
    return 1499; // Default for "Less Than 1500"
  }
  
  // Handle ranges like '1501-2000', '2001-2500', etc.
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    const min = parseInt(parts[0], 10) || 0;
    const max = parseInt(parts[1], 10) || min;
    // Use upper bound - 1 to ensure we stay within this range tier
    return max - 1;
  }
  
  // Try to parse as direct number
  const num = parseInt(cleaned, 10);
  return !isNaN(num) ? num : 1500;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Convert square footage range to midpoint if it's a range string
    let squareFootage = Number(body.squareFeet);
    if (isNaN(squareFootage)) {
      squareFootage = convertSquareFootageRange(body.squareFeet);
    }
    
    const inputs: QuoteInputs = {
      squareFeet: squareFootage,
      people: Number(body.people),
      pets: Number(body.pets),
      sheddingPets: Number(body.sheddingPets),
      condition: body.condition,
    };

    const result = await calcQuote(inputs);

    if (result.outOfLimits || !result.ranges) {
      return NextResponse.json({
        outOfLimits: true,
        message: result.message || 'Unable to calculate quote.',
      });
    }

    // At this point, TypeScript knows ranges is defined
    const summaryText = generateSummaryText({ ...result, ranges: result.ranges }, body.serviceType, body.frequency);
    const smsText = generateSmsText({ ...result, ranges: result.ranges });

    // Attempt GHL integration (non-blocking)
    let ghlContactId: string | undefined;
    const hasGHLToken = await ghlTokenExists().catch(() => false);
    
    if (hasGHLToken) {
      try {
        // Get GHL configuration
        const ghlConfig = await getGHLConfig();

        // ALWAYS create/update contact when quote is given (required for bookings to work)
        // Even if createContact is disabled, we still create it for booking functionality
        // Get survey questions to map fields
        const surveyQuestions = await getSurveyQuestions();
        
        // Build contact data using field mappings
        const contactData: any = {
            firstName: 'Unknown',
            lastName: 'Customer',
            source: 'Website Quote Form',
            tags: [
              'Quote Request',
              body.serviceType || 'Unknown Service',
              body.frequency || 'Unknown Frequency',
            ].filter(Boolean),
            customFields: {},
          };

        // Build a map of field IDs to their GHL custom field mappings
        // This helps us find mappings for standard fields like squareFeet, serviceType, etc.
        const fieldIdToMapping = new Map<string, string>();
        surveyQuestions.forEach((question: SurveyQuestion) => {
          if (question.ghlFieldMapping) {
            fieldIdToMapping.set(question.id, question.ghlFieldMapping);
            // Also map sanitized version (dots replaced with underscores)
            const sanitizedId = question.id.replace(/\./g, '_');
            if (sanitizedId !== question.id) {
              fieldIdToMapping.set(sanitizedId, question.ghlFieldMapping);
            }
          }
        });

        console.log('🔍 Custom field mapping debug:', {
          surveyQuestionCount: surveyQuestions.length,
          mappingsFound: Array.from(fieldIdToMapping.entries()).map(([id, mapping]) => ({ id, mapping })),
          bodyKeys: Object.keys(body),
        });

        // Map form data to GHL fields based on survey question mappings
        // Only use fields that have explicit GHL custom field mappings
        surveyQuestions.forEach((question: SurveyQuestion) => {
          // Handle both original IDs and sanitized field names
          let fieldValue = body[question.id as keyof typeof body];
          if (fieldValue === undefined || fieldValue === null) {
            // Try sanitized version (dots replaced with underscores)
            const sanitizedId = question.id.replace(/\./g, '_');
            fieldValue = body[sanitizedId as keyof typeof body];
          }
          
          if (fieldValue === undefined || fieldValue === null || fieldValue === '') return;

          const mapping = question.ghlFieldMapping;
          
          console.log(`🔍 Mapping field "${question.id}":`, {
            questionId: question.id,
            fieldValue,
            hasMapping: !!mapping,
            mapping,
          });
          
          // Handle native fields (firstName, lastName, email, phone)
          if (mapping === 'firstName' || mapping === 'lastName' || mapping === 'email' || mapping === 'phone') {
            contactData[mapping] = String(fieldValue);
          } else if (mapping) {
            // Custom field with explicit mapping - use the mapped GHL custom field key
            contactData.customFields![mapping] = String(fieldValue);
            console.log(`✅ Added custom field: ${mapping} = ${fieldValue}`);
          }
          // NO mapping - skip it (don't add unmapped fields to customFields)
        });

        // Also check standard fields for mappings (squareFeet, serviceType, etc.)
        // Only add them if they have a mapping in survey questions
        const standardFieldIds = ['squareFeet', 'people', 'bedrooms', 'fullBaths', 'halfBaths', 'sheddingPets', 'condition', 'serviceType', 'frequency', 'hasPreviousService', 'cleanedWithin3Months'];
        standardFieldIds.forEach((fieldId) => {
          const fieldValue = body[fieldId];
          if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
            const mapping = fieldIdToMapping.get(fieldId);
            if (mapping && mapping !== 'firstName' && mapping !== 'lastName' && mapping !== 'email' && mapping !== 'phone') {
              // Only add if it has a mapping to a GHL custom field (not native fields)
              contactData.customFields![mapping] = String(fieldValue);
            }
          }
        });

        // Fallback to direct body fields if no mappings exist (backward compatibility)
        if (!contactData.firstName || contactData.firstName === 'Unknown') {
          contactData.firstName = body.firstName || 'Unknown';
        }
        if (!contactData.lastName || contactData.lastName === 'Customer') {
          contactData.lastName = body.lastName || 'Customer';
        }
        if (!contactData.email) {
          contactData.email = body.email;
        }
        if (!contactData.phone) {
          contactData.phone = body.phone;
        }

        // Remove customFields if empty
        if (Object.keys(contactData.customFields || {}).length === 0) {
          delete contactData.customFields;
        }

        console.log('📞 Sending contact data to GHL:', {
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          email: contactData.email,
          phone: contactData.phone,
          source: contactData.source,
          tags: contactData.tags,
          customFieldsCount: Object.keys(contactData.customFields || {}).length,
          customFields: contactData.customFields,
        });

        // Pass additional tags (in-service tags)
        const contact = await createOrUpdateContact(
          contactData, 
          undefined, // token - will use stored token
          undefined, // locationId - will use stored locationId
          ghlConfig?.inServiceTags // additional tags for in-service customers
        );
        
        if (!contact || !contact.id) {
          console.error('Contact creation failed - no contact ID returned:', contact);
          throw new Error('Failed to create contact - no contact ID returned');
        }
        
        ghlContactId = contact.id;
        console.log('✅ Contact created in GHL:', ghlContactId);
        
        // Note: Contact creation happens regardless of createContact config
        // This ensures bookings work even if contact creation is "disabled"

        // Create opportunity if enabled
        if (ghlConfig?.createOpportunity && ghlContactId) {
          // Calculate opportunity value
          let opportunityValue = ghlConfig.opportunityMonetaryValue;
          
          // If using dynamic pricing, calculate from selected service
          if (ghlConfig.useDynamicPricingForValue !== false) {
            opportunityValue = getSelectedQuotePrice(result.ranges, body.serviceType, body.frequency);
          }

          const opportunityName = `Cleaning Quote - ${body.serviceType || 'General'} - ${body.frequency || 'TBD'}`;

          // Get the selected price range for storing
          const selectedRange = getSelectedQuoteRange(result.ranges, body.serviceType, body.frequency);

          await createOpportunity({
            contactId: ghlContactId,
            name: opportunityName,
            value: opportunityValue,
            pipelineId: ghlConfig.pipelineId,
            pipelineStageId: ghlConfig.pipelineStageId,
            status: (ghlConfig.opportunityStatus as 'open' | 'won' | 'lost' | 'abandoned') || 'open',
            customFields: {
              // Home details
              squareFeet: String(body.squareFeet),
              beds: String(body.bedrooms || 0),
              baths: String((body.fullBaths || 0) + (body.halfBaths || 0) * 0.5),
              people: String(body.people || 0),
              sheddingPets: String(body.sheddingPets || 0),
              condition: body.condition || 'Unknown',
              
              // Service details
              serviceType: body.serviceType || 'Not specified',
              frequency: body.frequency || 'Not specified',
              
              // Quote pricing
              quoteMin: String(selectedRange?.low || 0),
              quoteMax: String(selectedRange?.high || 0),
              quotePriceMiddle: String(opportunityValue || 0),
              ...(ghlConfig.quotedAmountField ? {
                [ghlConfig.quotedAmountField]: String(opportunityValue || 0),
              } : {}),
            },
          });
        }

        // Create note if enabled
        if (ghlConfig?.createNote !== false && ghlContactId) {
          const noteBody = `Quote Generated from Website Form\n\n${summaryText}`;

          await createNote({
            contactId: ghlContactId,
            body: noteBody,
          });
        }

        console.log('Successfully synced quote to GHL for contact:', ghlContactId);
      } catch (ghlError) {
        console.error('GHL integration failed (quote still delivered):', ghlError);
        console.error('Error details:', {
          message: ghlError instanceof Error ? ghlError.message : String(ghlError),
          stack: ghlError instanceof Error ? ghlError.stack : undefined,
        });
        // Don't throw - we still want to deliver the quote to the customer
        // But log the error so we can debug why contact creation failed
      }
    }

    return NextResponse.json({
      outOfLimits: false,
      multiplier: result.multiplier,
      inputs: result.inputs,
      ranges: result.ranges,
      initialCleaningRequired: result.initialCleaningRequired,
      summaryText,
      smsText,
      ghlContactId,
    });
  } catch (error) {
    console.error('Error calculating quote:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      { 
        error: 'Failed to calculate quote. Please check the pricing data file.',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
