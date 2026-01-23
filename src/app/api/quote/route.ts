import { NextRequest, NextResponse } from 'next/server';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText } from '@/lib/pricing/format';
import { QuoteInputs, QuoteRanges } from '@/lib/pricing/types';
import { createOrUpdateContact, createOpportunity, createNote, createCustomObject } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig, getKV } from '@/lib/kv';
import { getSurveyQuestions } from '@/lib/survey/manager';
import { SurveyQuestion } from '@/lib/survey/schema';
import { randomUUID } from 'crypto';

/**
 * Helper to get the selected quote range based on service type and frequency
 */
function getSelectedQuoteRange(ranges: QuoteRanges, serviceType: string, frequency: string): { low: number; high: number } | null {
  // Handle frequency-based pricing first
  if (frequency === 'weekly') {
    return ranges.weekly;
  } else if (frequency === 'bi-weekly') {
    return ranges.biWeekly;
  } else if (frequency === 'four-week' || frequency === 'monthly') {
    return ranges.fourWeek;
  } 
  
  // Handle one-time services
  if (frequency === 'one-time' || !frequency) {
    if (serviceType === 'initial') {
      return ranges.initial;
    } else if (serviceType === 'deep') {
      return ranges.deep;
    } else if (serviceType === 'general') {
      return ranges.general;
    } else if (serviceType === 'move-in') {
      return ranges.moveInOutBasic;
    } else if (serviceType === 'move-out') {
      return ranges.moveInOutFull;
    }
  }
  
  return null;
}

/**
 * Helper to get the selected quote price based on service type and frequency
 */
function getSelectedQuotePrice(ranges: any, serviceType: string, frequency: string): number {
  // Handle frequency-based pricing first
  if (frequency === 'weekly') {
    return Math.round((ranges.weekly.low + ranges.weekly.high) / 2);
  } else if (frequency === 'bi-weekly') {
    return Math.round((ranges.biWeekly.low + ranges.biWeekly.high) / 2);
  } else if (frequency === 'four-week' || frequency === 'monthly') {
    return Math.round((ranges.fourWeek.low + ranges.fourWeek.high) / 2);
  }
  
  // Handle one-time services
  if (frequency === 'one-time' || !frequency) {
    if (serviceType === 'initial') {
      return Math.round((ranges.initial.low + ranges.initial.high) / 2);
    } else if (serviceType === 'deep') {
      return Math.round((ranges.deep.low + ranges.deep.high) / 2);
    } else if (serviceType === 'general') {
      return Math.round((ranges.general.low + ranges.general.high) / 2);
    } else if (serviceType === 'move-in') {
      return Math.round((ranges.moveInOutBasic.low + ranges.moveInOutBasic.high) / 2);
    } else if (serviceType === 'move-out') {
      return Math.round((ranges.moveInOutFull.low + ranges.moveInOutFull.high) / 2);
    }
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
    const { ghlContactId: providedContactId } = body;
    
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

    // Generate quoteId early for tracking/redirect purposes
    // This ensures we always have a quoteId even if GHL custom object creation fails
    const generatedQuoteId = randomUUID();
    let quoteId: string | undefined = generatedQuoteId; // Use generated ID as default
    
    // Track whether GHL quote creation succeeded (for KV storage metadata)
    let ghlQuoteCreated = false;
    let quoteCustomFields: Record<string, string> = {};
    
    // Attempt GHL integration (non-blocking)
    // If a contact was already created after address step, use that ID; otherwise create/update
    let ghlContactId: string | undefined = providedContactId;
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

        // Add configured quote completed tags if available
        if (ghlConfig?.quoteCompletedTags && Array.isArray(ghlConfig.quoteCompletedTags) && ghlConfig.quoteCompletedTags.length > 0) {
          contactData.tags.push(...ghlConfig.quoteCompletedTags);
        }

        // Add address information if provided
        if (body.address) {
          contactData.address1 = body.address;
        }
        if (body.city) {
          contactData.city = body.city;
        }
        if (body.state) {
          contactData.state = body.state;
        }
        if (body.postalCode) {
          contactData.postalCode = body.postalCode;
        }
        if (body.country) {
          contactData.country = body.country;
        }

        // Build a map of field IDs (both original and sanitized) to their GHL custom field mappings
        // IMPORTANT: This honors admin-set mappings from the Survey Builder UI
        // The form sanitizes field IDs (replaces dots with underscores), so we need to map both versions
        const fieldIdToMapping = new Map<string, string>();
        surveyQuestions.forEach((question: SurveyQuestion) => {
          // Only process questions that have a ghlFieldMapping set by admin in Survey Builder
          // (not null, not undefined, not empty string)
          if (question.ghlFieldMapping && question.ghlFieldMapping.trim() !== '') {
            // Map original question ID to admin-set mapping
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
          
          // Handle native fields (firstName, lastName, email, phone, address1, city, state, postalCode, country)
          // Check if mapping is a native field - strip prefix first to check
          const mappingWithoutPrefix = mapping.replace(/^(contact|opportunity)\./, '');
          const nativeFields = ['firstName', 'lastName', 'email', 'phone', 'address1', 'address', 'city', 'state', 'postalCode', 'country'];
          const isNativeField = nativeFields.includes(mappingWithoutPrefix);
          
          if (isNativeField) {
            // Map address -> address1 for consistency with GHL API
            const nativeFieldName = mappingWithoutPrefix === 'address' ? 'address1' : mappingWithoutPrefix;
            contactData[nativeFieldName] = String(fieldValue);
            console.log(`✅ Mapped to native field (admin mapping): ${nativeFieldName} = ${fieldValue}`, {
              originalMapping: mapping,
              nativeFieldName,
            });
          } else {
            // Custom field with explicit admin-set mapping
            // GHL API expects just the field key without "contact." or "opportunity." prefix
            // Strip prefix if present to ensure compatibility with GHL API
            const cleanedMapping = mapping.replace(/^(contact|opportunity)\./, '');
            contactData.customFields![cleanedMapping] = String(fieldValue);
            console.log(`✅ Added custom field (admin mapping): ${cleanedMapping} = ${fieldValue}`, {
              originalMapping: mapping,
              cleanedMapping,
              fieldValue,
            });
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

        // Create Quote custom object in GHL
        // IMPORTANT: Always attempt to create quote in GHL, even if it fails we'll store in KV
        if (ghlContactId) {
          try {
            // Use the already-generated quoteId for the quote_id field
            // This ensures consistency between the URL quoteId and the stored quote_id
            
            // Build service address string
            const addressParts = [
              body.address,
              body.city,
              body.state,
              body.postalCode,
              body.country,
            ].filter(Boolean);
            const serviceAddress = addressParts.join(', ') || '';

            // Get selected quote range for storing price ranges
            const selectedRange = getSelectedQuoteRange(result.ranges, body.serviceType, body.frequency);

            // Map all fields to Quote custom object
            // IMPORTANT: Use full fieldKey format: custom_objects.quotes.field_name
            // Also map values to match dropdown options from the schema
            
            // Map service type to schema options
            const serviceTypeMap: Record<string, string> = {
              'general': 'general_cleaning',
              'initial': 'initial_cleaning',
              'deep': 'deep_clean',
              'move-in': 'move_in',
              'move-out': 'move_out',
              'recurring': 'recurring_cleaning',
            };
            const mappedServiceType = serviceTypeMap[body.serviceType || ''] || body.serviceType || '';
            
            // Map frequency to schema options
            const frequencyMap: Record<string, string> = {
              'weekly': 'weekly',
              'bi-weekly': 'biweekly',
              'four-week': 'monthly',
              'monthly': 'monthly',
              'one-time': 'one_time',
            };
            const mappedFrequency = frequencyMap[body.frequency || ''] || body.frequency || '';
            
            // Map condition to schema options
            const conditionMap: Record<string, string> = {
              'excellent': 'excellent',
              'good': 'good',
              'average': 'average',
              'poor': 'poor',
              'very-poor': 'very_poor',
            };
            const mappedCondition = conditionMap[body.condition || ''] || body.condition || '';
            
            // Map cleaning_service_prior
            let mappedCleaningServicePrior = 'no';
            if (body.hasPreviousService === 'true' || body.hasPreviousService === true) {
              mappedCleaningServicePrior = 'yes';
            } else if (body.hasPreviousService === 'switching') {
              mappedCleaningServicePrior = 'yes_but_switching';
            }
            
            // Map cleaned_in_last_3_months
            let mappedCleanedInLast3Months = 'no';
            if (body.cleanedWithin3Months === 'yes' || body.cleanedWithin3Months === true) {
              mappedCleanedInLast3Months = 'yes';
            } else if (body.cleanedWithin3Months === 'not-sure' || body.cleanedWithin3Months === 'not sure') {
              mappedCleanedInLast3Months = 'not_sure';
            }
            
            // IMPORTANT: For GHL API, use just the field names (without custom_objects.quotes. prefix)
            // The prefix is only used in GHL templates/workflows, not in API requests
            quoteCustomFields = {
              'quote_id': generatedQuoteId, // Use the generated UUID for quote_id field
              'service_address': serviceAddress,
              'square_footage': String(body.squareFeet || ''),
              'type': mappedServiceType,
              'frequency': mappedFrequency,
              'full_baths': String(body.fullBaths || 0),
              'half_baths': String(body.halfBaths || 0),
              'bedrooms': String(body.bedrooms || 0),
              'people_in_home': String(body.people || 0),
              'shedding_pets': String(body.sheddingPets || 0),
              'current_condition': mappedCondition,
              'cleaning_service_prior': mappedCleaningServicePrior,
              'cleaned_in_last_3_months': mappedCleanedInLast3Months,
            };
            
            // Note: quote_range_low and quote_range_high are not in the schema
            // If you want to store these, you'll need to add them as fields in GHL first

            // Create Quote custom object
            // The schemaKey should be just "quotes" (not "custom_objects.quotes")
            // The customFields keys should be just the field names (not "custom_objects.quotes.field_name")
            const quoteObject = await createCustomObject(
              'quotes', // Schema key is just "quotes" (lowercase plural)
              {
                contactId: ghlContactId,
                customFields: quoteCustomFields,
              }
            );

            // Use the ID returned from GHL as the quote ID for the URL (if available)
            // If GHL returns an ID, use it; otherwise keep the generated UUID
            // The quote_id field in customFields stores the UUID for reference
            if (quoteObject?.id) {
              quoteId = quoteObject.id;
              ghlQuoteCreated = true;
            }
            // If quoteObject.id is not available, quoteId already has the generatedQuoteId as fallback
            console.log('✅ Quote custom object created in GHL:', {
              objectId: quoteObject.id,
              quoteIdField: generatedQuoteId,
              contactId: ghlContactId,
            });
          } catch (quoteError) {
            // Custom object creation failed - log detailed error
            const errorMessage = quoteError instanceof Error ? quoteError.message : String(quoteError);
            console.error('⚠️ Failed to create Quote custom object in GHL:', errorMessage);
            console.error('📋 Quote object creation error details:', {
              error: errorMessage,
              contactId: ghlContactId,
              customFieldsCount: Object.keys(quoteCustomFields).length,
              customFieldsKeys: Object.keys(quoteCustomFields),
              troubleshooting: 'If you want to use custom objects, please ensure:\n' +
                '1. A "Quote" custom object exists in your GHL account (Settings > Custom Objects)\n' +
                '2. The object has fields matching these keys: ' + Object.keys(quoteCustomFields).join(', ') + '\n' +
                '3. Your API token has objects/record.write scope enabled',
            });
            // Don't throw - quote will be stored in KV as backup
            // The quote was successfully calculated and contact was created, so we continue
          }
        } else {
          // No contact ID - still prepare quoteCustomFields for KV storage
          console.log('⚠️ No GHL contact ID available - quote will be stored in KV only');
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

    // ALWAYS store quote data in KV (required for API access)
    // This ensures quotes are always accessible via the API endpoint, even if GHL creation fails
    // The quoteId is always generated, so this will always execute
    try {
      const kv = getKV();
      const quoteData = {
        outOfLimits: false,
        multiplier: result.multiplier,
        inputs: result.inputs,
        ranges: result.ranges,
        initialCleaningRequired: result.initialCleaningRequired,
        initialCleaningRecommended: result.initialCleaningRecommended,
        summaryText,
        smsText,
        ghlContactId,
        serviceType: body.serviceType,
        frequency: body.frequency,
        createdAt: new Date().toISOString(),
        // Store GHL quote creation status for debugging
        ghlQuoteCreated: ghlQuoteCreated || false,
        // Store the original quote custom fields for potential retry
        quoteCustomFields: Object.keys(quoteCustomFields).length > 0 ? quoteCustomFields : undefined,
      };
      // Store with 30 day expiration (for tracking purposes)
      await kv.setex(`quote:${quoteId}`, 60 * 60 * 24 * 30, JSON.stringify(quoteData));
      console.log(`✅ Stored quote data in KV (always accessible via API): ${quoteId}`);
      
      // If GHL creation failed but we have the data, log for potential retry
      if (!ghlQuoteCreated && ghlContactId && Object.keys(quoteCustomFields).length > 0) {
        console.warn(`⚠️ Quote ${quoteId} stored in KV but not in GHL - may need manual retry`);
      }
    } catch (kvError) {
      // KV storage failure is critical - log as error but don't block response
      console.error('❌ CRITICAL: Failed to store quote in KV - quote may not be accessible via API:', kvError);
      // Still return the quoteId so redirect can happen, but user should be aware
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
      ghlContactId,
      quoteId, // Always include quoteId (generated UUID, or GHL object ID if available)
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
