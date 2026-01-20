import { NextRequest, NextResponse } from 'next/server';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText } from '@/lib/pricing/format';
import { QuoteInputs } from '@/lib/pricing/types';
import { createOrUpdateContact, createOpportunity, createNote } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig, getSurveyQuestions, SurveyQuestion } from '@/lib/kv';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inputs: QuoteInputs = {
      squareFeet: Number(body.squareFeet),
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

        // Create/update contact if enabled
        if (ghlConfig?.createContact !== false) {
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

          // Map form data to GHL fields based on survey question mappings
          surveyQuestions.forEach((question: SurveyQuestion) => {
            const fieldValue = body[question.id as keyof typeof body];
            if (fieldValue === undefined || fieldValue === null || fieldValue === '') return;

            const mapping = question.ghlFieldMapping;
            if (!mapping) return; // Skip if no mapping

            // Handle native fields
            if (mapping === 'firstName' || mapping === 'lastName' || mapping === 'email' || mapping === 'phone') {
              contactData[mapping] = String(fieldValue);
            } else {
              // Custom field
              contactData.customFields![mapping] = String(fieldValue);
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

          // Pass additional tags (in-service tags)
          const contact = await createOrUpdateContact(
            contactData, 
            undefined, // token - will use stored token
            undefined, // locationId - will use stored locationId
            ghlConfig?.inServiceTags // additional tags for in-service customers
          );
          ghlContactId = contact.id;
        }

        // Create opportunity if enabled
        if (ghlConfig?.createOpportunity && ghlContactId) {
          // Calculate opportunity value
          let opportunityValue = ghlConfig.opportunityMonetaryValue;
          
          // If using dynamic pricing, calculate from selected service
          if (ghlConfig.useDynamicPricingForValue !== false) {
            opportunityValue = getSelectedQuotePrice(result.ranges, body.serviceType, body.frequency);
          }

          const opportunityName = `Cleaning Quote - ${body.serviceType || 'General'} - ${body.frequency || 'TBD'}`;

          await createOpportunity({
            contactId: ghlContactId,
            name: opportunityName,
            value: opportunityValue,
            pipelineId: ghlConfig.pipelineId,
            pipelineStageId: ghlConfig.pipelineStageId,
            status: (ghlConfig.opportunityStatus as 'open' | 'won' | 'lost' | 'abandoned') || 'open',
            customFields: {
              squareFeet: String(body.squareFeet),
              beds: String(body.bedrooms || 0),
              baths: String((body.fullBaths || 0) + (body.halfBaths || 0) * 0.5),
              condition: body.condition || 'Unknown',
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
        console.warn('GHL integration failed (quote still delivered):', ghlError);
        // Don't throw - we still want to deliver the quote to the customer
      }
    }

    return NextResponse.json({
      outOfLimits: false,
      multiplier: result.multiplier,
      inputs: result.inputs,
      ranges: result.ranges,
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
