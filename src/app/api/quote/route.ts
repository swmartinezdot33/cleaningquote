import { NextRequest, NextResponse } from 'next/server';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText } from '@/lib/pricing/format';
import { QuoteInputs, QuoteRanges } from '@/lib/pricing/types';
import { createOrUpdateContact, createOpportunity, createNote } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig } from '@/lib/kv';
import { getSurveyQuestions } from '@/lib/survey/manager';
import { SurveyQuestion } from '@/lib/survey/schema';

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
      hasPreviousService: body.hasPreviousService,
      cleanedWithin3Months: body.cleanedWithin3Months,
    };

    const result = await calcQuote(inputs);

    if (result.outOfLimits || !result.ranges) {
      return NextResponse.json({
        outOfLimits: true,
        message: result.message || 'Unable to calculate quote.',
      });
    }

    // At this point, TypeScript knows ranges is defined
    // Pass the original square footage range string if it's a range (not a number)
    const squareFeetRange = typeof body.squareFeet === 'string' && body.squareFeet.includes('-') 
      ? body.squareFeet 
      : typeof body.squareFeet === 'string' && body.squareFeet.toLowerCase().includes('less than')
      ? body.squareFeet
      : undefined;
    const summaryText = generateSummaryText({ ...result, ranges: result.ranges }, body.serviceType, body.frequency, squareFeetRange);
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

        // Build a map of field IDs (both original and sanitized) to their GHL custom field mappings
        // The form sanitizes field IDs (replaces dots with underscores), so we need to map both versions
        const fieldIdToMapping = new Map<string, string>();
        surveyQuestions.forEach((question: SurveyQuestion) => {
          // Only process questions that have a ghlFieldMapping set (not null, not undefined, not empty string)
          if (question.ghlFieldMapping && question.ghlFieldMapping.trim() !== '') {
            // Map original question ID
            fieldIdToMapping.set(question.id, question.ghlFieldMapping.trim());
            // Also map sanitized version (dots replaced with underscores) - this is what's in the body
            const sanitizedId = question.id.replace(/\./g, '_');
            fieldIdToMapping.set(sanitizedId, question.ghlFieldMapping.trim());
          }
        });

        // Enhanced logging to verify mappings are loaded correctly
        const questionsWithMappings = surveyQuestions.filter(q => q.ghlFieldMapping && q.ghlFieldMapping.trim() !== '');
        console.log('🔍 Custom field mapping debug:', {
          surveyQuestionCount: surveyQuestions.length,
          questionsWithMappings: questionsWithMappings.length,
          mappingsFound: Array.from(fieldIdToMapping.entries()).map(([id, mapping]) => ({ id, mapping })),
          bodyKeys: Object.keys(body),
          bodyKeysWithValues: Object.keys(body).filter(key => body[key] !== undefined && body[key] !== null && body[key] !== ''),
          allQuestionsWithMappings: questionsWithMappings.map(q => ({
            id: q.id,
            sanitizedId: q.id.replace(/\./g, '_'),
            label: q.label,
            ghlFieldMapping: q.ghlFieldMapping,
          })),
          sampleQuestions: surveyQuestions.slice(0, 10).map(q => ({
            id: q.id,
            sanitizedId: q.id.replace(/\./g, '_'),
            label: q.label,
            hasMapping: !!q.ghlFieldMapping && q.ghlFieldMapping.trim() !== '',
            mapping: q.ghlFieldMapping,
          })),
          fieldIdToMappingSize: fieldIdToMapping.size,
        });

        // Iterate through ALL fields in the body and map them to GHL fields
        // This ensures we capture all survey data, including fields that might not match exactly
        let mappedFieldsCount = 0;
        let skippedFieldsCount = 0;
        
        Object.keys(body).forEach((bodyKey) => {
          const fieldValue = body[bodyKey];
          
          // Skip if value is empty or undefined
          if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
            skippedFieldsCount++;
            return;
          }
          
          // Get the mapping for this field (should work since we mapped sanitized versions)
          const mapping = fieldIdToMapping.get(bodyKey);
          
          if (!mapping) {
            // No mapping found - this field won't be sent to GHL
            skippedFieldsCount++;
            console.log(`⏭️  Skipping unmapped field "${bodyKey}": ${fieldValue}`);
            return;
          }
          
          mappedFieldsCount++;
          console.log(`🔍 Mapping field "${bodyKey}":`, {
            bodyKey,
            fieldValue,
            mapping,
          });
          
          // Handle native fields (firstName, lastName, email, phone)
          if (mapping === 'firstName' || mapping === 'lastName' || mapping === 'email' || mapping === 'phone') {
            contactData[mapping] = String(fieldValue);
            console.log(`✅ Mapped to native field: ${mapping} = ${fieldValue}`);
          } else {
            // Custom field with explicit mapping - use the mapped GHL custom field key
            contactData.customFields![mapping] = String(fieldValue);
            console.log(`✅ Added custom field: ${mapping} = ${fieldValue}`);
          }
        });
        
        console.log('📊 Field mapping summary:', {
          totalBodyFields: Object.keys(body).length,
          mappedFields: mappedFieldsCount,
          skippedFields: skippedFieldsCount,
          customFieldsCount: Object.keys(contactData.customFields || {}).length,
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

        // Add quoted amount to contact custom fields if configured - store the range
        if (ghlConfig?.quotedAmountField && result.ranges) {
          // Get the selected price range
          const selectedRange = getSelectedQuoteRange(result.ranges, body.serviceType, body.frequency);
          
          // Only add if we have a valid range
          if (selectedRange && selectedRange.low > 0 && selectedRange.high > 0) {
            // Extract just the field key (remove "contact." or "opportunity." prefix if present)
            // GHL custom fields use just the field key, not prefixed versions
            const fieldKey = ghlConfig.quotedAmountField.replace(/^(contact|opportunity)\./, '');
            // Store the range as a string like "$150 - $200"
            contactData.customFields![fieldKey] = `$${selectedRange.low} - $${selectedRange.high}`;
            console.log(`✅ Added quoted amount range to contact custom field:`, {
              originalField: ghlConfig.quotedAmountField,
              cleanedFieldKey: fieldKey,
              range: `$${selectedRange.low} - $${selectedRange.high}`,
              low: selectedRange.low,
              high: selectedRange.high,
            });
          }
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
          customFieldsDetail: contactData.customFields ? Object.entries(contactData.customFields).map(([key, value]) => ({
            ghlFieldKey: key,
            value: value,
            valueType: typeof value,
          })) : [],
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
          // Get the selected price range first
          const selectedRange = getSelectedQuoteRange(result.ranges, body.serviceType, body.frequency);
          
          // Calculate opportunity value - use high end of range to show maximum potential value
          let opportunityValue = ghlConfig.opportunityMonetaryValue;
          
          // If using dynamic pricing, use the high end of the selected range
          if (ghlConfig.useDynamicPricingForValue !== false) {
            if (selectedRange) {
              // Use high end of range for opportunity value (shows maximum potential)
              opportunityValue = selectedRange.high;
            } else {
              // Fallback to calculated price if range not found
              opportunityValue = getSelectedQuotePrice(result.ranges, body.serviceType, body.frequency);
            }
          }

          // Use contact's name for opportunity name, fallback to service type if name not available
          const contactFirstName = contactData.firstName && contactData.firstName !== 'Unknown' ? contactData.firstName : '';
          const contactLastName = contactData.lastName && contactData.lastName !== 'Customer' ? contactData.lastName : '';
          const contactName = [contactFirstName, contactLastName].filter(Boolean).join(' ').trim();
          
          // Build opportunity name: Use contact name with price range if available
          let opportunityName: string;
          if (contactName) {
            // Include price range in the name for visibility
            if (selectedRange) {
              opportunityName = `Cleaning Quote - ${contactName} ($${selectedRange.low}-$${selectedRange.high})`;
            } else {
              opportunityName = `Cleaning Quote - ${contactName}`;
            }
          } else {
            // Fallback to service details with range
            if (selectedRange) {
              opportunityName = `Cleaning Quote - ${body.serviceType || 'General'} - ${body.frequency || 'TBD'} ($${selectedRange.low}-$${selectedRange.high})`;
            } else {
              opportunityName = `Cleaning Quote - ${body.serviceType || 'General'} - ${body.frequency || 'TBD'}`;
            }
          }

          // Build opportunity custom fields
          const opportunityCustomFields: Record<string, string> = {
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
            
            // Quote pricing - store the full range
            quoteMin: String(selectedRange?.low || 0),
            quoteMax: String(selectedRange?.high || 0),
            quoteRange: selectedRange ? `$${selectedRange.low} - $${selectedRange.high}` : 'N/A',
            quotePriceMiddle: String(opportunityValue || 0),
          };

          // Add quoted amount field if configured - store the range, not just a single value
          if (ghlConfig.quotedAmountField && selectedRange) {
            // Extract just the field key (remove "opportunity." or "contact." prefix if present)
            // GHL custom fields use just the field key, not prefixed versions
            const fieldKey = ghlConfig.quotedAmountField.replace(/^(opportunity|contact)\./, '');
            // Store the range as a string like "$150 - $200"
            opportunityCustomFields[fieldKey] = `$${selectedRange.low} - $${selectedRange.high}`;
            console.log(`✅ Added quoted amount range to opportunity custom field:`, {
              originalField: ghlConfig.quotedAmountField,
              cleanedFieldKey: fieldKey,
              range: `$${selectedRange.low} - $${selectedRange.high}`,
              low: selectedRange.low,
              high: selectedRange.high,
            });
          }

          await createOpportunity({
            contactId: ghlContactId,
            name: opportunityName,
            value: opportunityValue,
            pipelineId: ghlConfig.pipelineId,
            pipelineStageId: ghlConfig.pipelineStageId,
            status: (ghlConfig.opportunityStatus as 'open' | 'won' | 'lost' | 'abandoned') || 'open',
            customFields: opportunityCustomFields,
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
