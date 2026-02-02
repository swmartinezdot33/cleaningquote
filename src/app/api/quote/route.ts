import { NextRequest, NextResponse } from 'next/server';
import { calcQuote } from '@/lib/pricing/calcQuote';
import { generateSummaryText, generateSmsText, getSquareFootageRangeDisplay } from '@/lib/pricing/format';
import { QuoteInputs, QuoteRanges } from '@/lib/pricing/types';
import { createOrUpdateContact, updateContact, createOpportunity, createNote, createCustomObject } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLConfig, getGHLToken, getGHLLocationId, getKV } from '@/lib/kv';
import { getSurveyQuestions, getSurveyDisplayLabels } from '@/lib/survey/manager';
import { createSupabaseServer } from '@/lib/supabase/server';
import { SurveyQuestion } from '@/lib/survey/schema';
import { sanitizeCustomFields } from '@/lib/ghl/field-normalizer';
import { parseAddress } from '@/lib/utils/parseAddress';

/**
 * Generate a human-readable, unique Quote ID
 * Format: QT-YYMMDD-XXXXX
 * Example: QT-260124-A9F2X
 */
function generateReadableQuoteId(): string {
  const date = new Date();
  // Get YYMMDD format
  const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
  // Get random 5-character suffix (alphanumeric, uppercase)
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `QT-${yymmdd}-${randomSuffix}`;
}

/**
 * Helper to get the selected quote range based on service type and frequency.
 * Normalizes serviceType/frequency so values from the form (e.g. "Initial", "biweekly") still match.
 */
function getSelectedQuoteRange(ranges: QuoteRanges, serviceType: string, frequency: string): { low: number; high: number } | null {
  const freq = String(frequency ?? '').toLowerCase().trim();
  const st = String(serviceType ?? '').toLowerCase().trim();
  const freqNorm = freq === 'biweekly' ? 'bi-weekly' : freq;

  // Handle frequency-based pricing first
  if (freqNorm === 'weekly') return ranges.weekly;
  if (freqNorm === 'bi-weekly') return ranges.biWeekly;
  if (freqNorm === 'four-week' || freqNorm === 'monthly') return ranges.fourWeek;

  // Handle one-time services (frequency is one-time or empty)
  if (freqNorm === 'one-time' || !freqNorm) {
    if (st === 'initial') return ranges.initial;
    if (st === 'deep') return ranges.deep;
    if (st === 'general') return ranges.general;
    if (st === 'move-in') return ranges.moveInOutBasic;
    if (st === 'move-out') return ranges.moveInOutFull;
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
    } else if (serviceType === 'move-in' || serviceType === 'move-out') {
      return Math.round((ranges.moveInOutBasic.low + ranges.moveInOutBasic.high) / 2);
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
    const { ghlContactId: providedContactId, contactId: bodyContactId, toolSlug, toolId: bodyToolId } = body;

    // Resolve tool for multi-tenant: prefer toolId (unambiguous). If only toolSlug, resolve by slug but fail if multiple orgs use same slug.
    let toolId: string | undefined = typeof bodyToolId === 'string' && bodyToolId.trim() ? bodyToolId.trim() : undefined;
    if (!toolId && toolSlug && typeof toolSlug === 'string') {
      const slug = toolSlug.trim();
      try {
        const supabase = createSupabaseServer();
        const { data: toolsWithSlug } = await supabase.from('tools').select('id').eq('slug', slug);
        const list = (toolsWithSlug ?? []) as { id: string }[];
        if (list.length > 1) {
          return NextResponse.json(
            {
              error: 'Multiple tools use this slug. Use an org-scoped embed URL so quotes go to the right org: /t/{orgSlug}/{toolSlug} (e.g. /t/raleighcleaningcompany/default).',
              code: 'AMBIGUOUS_SLUG',
            },
            { status: 400 }
          );
        }
        if (list.length === 1) {
          toolId = list[0].id;
        }
      } catch (_) {
        toolId = undefined;
      }
    }

    // Extract UTM parameters from request URL and body (body takes precedence if both exist)
    const url = new URL(request.url);
    const utmParams: Record<string, string> = {};
    const utmParamNames = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid'];
    utmParamNames.forEach(param => {
      // Check body first (if frontend sends it), then URL
      const bodyValue = body[param];
      const urlValue = url.searchParams.get(param);
      const value = bodyValue || urlValue;
      if (value) {
        utmParams[param] = String(value);
      }
    });
    
    // Use utm_source only for Source – never the full URL. If absent, we use "Website Quote Form" later.
    const effectiveUtmSource = utmParams.utm_source && String(utmParams.utm_source).trim()
      ? utmParams.utm_source.trim()
      : null;
    
    // Convert square footage range to midpoint if it's a range string
    let squareFootage = Number(body.squareFeet);
    if (isNaN(squareFootage)) {
      squareFootage = convertSquareFootageRange(body.squareFeet);
    }
    
    const inputs: QuoteInputs = {
      squareFeet: squareFootage,
      bedrooms: Number(body.bedrooms) || 0,
      fullBaths: Number(body.fullBaths) || 0,
      halfBaths: Number(body.halfBaths) || 0,
      people: Number(body.people) || 0,
      pets: Number(body.pets) || 0,
      sheddingPets: Number(body.sheddingPets) || 0,
      condition: body.condition,
      hasPreviousService: body.hasPreviousService,
      cleanedWithin3Months: body.cleanedWithin3Months,
    };

    const result = await calcQuote(inputs, toolId);

    if (result.outOfLimits || !result.ranges) {
      return NextResponse.json({
        outOfLimits: true,
        message: result.message || 'Unable to calculate quote.',
      });
    }

    // At this point, TypeScript knows ranges is defined
    // Use explicit range string for GHL note: from body (squareFeetDisplay or squareFeet string) or derive from numeric value
    const squareFeetRangeFromBody =
      (typeof body.squareFeetDisplay === 'string' && body.squareFeetDisplay.trim() !== '')
        ? body.squareFeetDisplay.trim()
        : typeof body.squareFeet === 'string' && body.squareFeet.includes('-')
          ? body.squareFeet
          : typeof body.squareFeet === 'string' && body.squareFeet.toLowerCase().includes('less than')
            ? body.squareFeet
            : undefined;
    const squareFeetDisplayForNote = squareFeetRangeFromBody ?? getSquareFootageRangeDisplay(result.inputs?.squareFeet ?? (typeof body.squareFeet === 'number' ? body.squareFeet : 1500));
    let summaryLabels: { serviceTypeLabels: Record<string, string>; frequencyLabels: Record<string, string> } | undefined;
    try {
      const surveyQuestions = await getSurveyQuestions(toolId);
      summaryLabels = getSurveyDisplayLabels(surveyQuestions);
    } catch (_) { /* use built-in labels */ }
    const summaryText = generateSummaryText({ ...result, ranges: result.ranges }, body.serviceType, body.frequency, squareFeetDisplayForNote, summaryLabels);
    const smsText = generateSmsText({ ...result, ranges: result.ranges }, summaryLabels);

    // Generate readable quoteId early for tracking/redirect purposes
    // Format: QT-YYMMDD-XXXXX (e.g., QT-260124-A9F2X)
    // This ensures we always have a quoteId even if GHL custom object creation fails
    const generatedQuoteId = generateReadableQuoteId();
    let quoteId: string | undefined = generatedQuoteId; // Use generated ID as default
    
    // Track whether GHL quote creation succeeded (for KV storage metadata)
    let ghlQuoteCreated = false;
    let quoteCustomFields: Record<string, string> = {};
    
    // Attempt GHL integration (non-blocking)
    // If a contact was already created after address step or passed via contactId/ghlContactId param, use that ID
    let ghlContactId: string | undefined = providedContactId || bodyContactId;
    const hasGHLToken = await ghlTokenExists(toolId).catch(() => false);

    if (hasGHLToken) {
      try {
        const [ghlConfig, surveyQuestions, ghlToken, ghlLocationId] = await Promise.all([
          getGHLConfig(toolId),
          getSurveyQuestions(toolId),
          getGHLToken(toolId),
          getGHLLocationId(toolId),
        ]);

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

        // Combine address and address2 if address2 exists (GHL only has one address line)
        const fullAddress = body.address2
          ? `${body.address || ''} ${body.address2}`.trim()
          : body.address || '';

        // Always parse when we have an address string so GHL gets street, city, state, postalCode in native fields
        // (not the full address dumped into street address)
        let parsedStreetAddress = fullAddress;
        let parsedCity = body.city || '';
        let parsedState = body.state || '';
        let parsedPostalCode = body.postalCode || '';
        if (fullAddress && typeof fullAddress === 'string' && fullAddress.trim()) {
          const parsed = parseAddress(fullAddress.trim());
          parsedStreetAddress = parsed.streetAddress || fullAddress;
          parsedCity = body.city?.trim() || parsed.city || '';
          parsedState = body.state?.trim() || parsed.state || '';
          parsedPostalCode = body.postalCode?.trim() || parsed.zipCode || '';
        }

        // Set native GHL address fields from parsed components (street only in address1)
        if (parsedStreetAddress) contactData.address1 = parsedStreetAddress;
        if (parsedCity) contactData.city = parsedCity;
        if (parsedState) contactData.state = parsedState;
        if (parsedPostalCode) contactData.postalCode = parsedPostalCode;
        if (body.country) {
          contactData.country = body.country;
        }

        // Add UTM parameters to contact using GHL native fields (not customFields)
        // Source = utm_source only when present; otherwise "Website Quote Form". Never use full URL.
        if (effectiveUtmSource) {
          contactData.utmSource = effectiveUtmSource;
        }
        contactData.source = effectiveUtmSource || 'Website Quote Form';
        if (utmParams.utm_medium) {
          contactData.utmMedium = utmParams.utm_medium;
        }
        if (utmParams.utm_campaign) {
          contactData.utmCampaign = utmParams.utm_campaign;
        }
        if (utmParams.utm_term) {
          contactData.utmTerm = utmParams.utm_term;
        }
        if (utmParams.utm_content) {
          contactData.utmContent = utmParams.utm_content;
        }
        if (utmParams.gclid) {
          contactData.gclid = utmParams.gclid;
        }

        // Iframe / widget passthrough params for attribution (e.g. start=iframe-Staver, tashiane=Verther)
        const passthroughKeys = ['start', 'tashiane'];
        passthroughKeys.forEach(key => {
          const val = body[key];
          if (val != null && String(val).trim()) {
            const v = String(val).trim();
            contactData.tags = contactData.tags || [];
            contactData.tags.push(`${key}:${v}`);
          }
        });

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

        // Iterate through ALL fields in the body and map them to GHL fields
        // This ensures we capture all survey data, including fields that might not match exactly
        const nativeFieldList = ['firstName', 'lastName', 'email', 'phone', 'address1', 'address', 'city', 'state', 'postalCode', 'country'];
        let mappedFieldsCount = 0;
        let skippedFieldsCount = 0;
        
        Object.keys(body).forEach((bodyKey) => {
          let fieldValue = body[bodyKey];
          
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
            return;
          }
          
          // Normalize special fields that have select/dropdown values
          // These need to be converted from their display form to their GHL schema values
          if (bodyKey === 'serviceType') {
            // Map display values like "move-out Clean" to schema values like "move_out"
            const serviceTypeMap: Record<string, string> = {
              'general': 'general_cleaning',
              'general cleaning': 'general_cleaning',
              'initial': 'initial_cleaning',
              'initial cleaning': 'initial_cleaning',
              'deep': 'deep_clean',
              'deep clean': 'deep_clean',
              'move-in': 'move_in',
              'move-in clean': 'move_in',
              'move-out': 'move_out',
              'move-out clean': 'move_out',
              'recurring': 'recurring_cleaning',
            };
            fieldValue = serviceTypeMap[String(fieldValue).toLowerCase()] || String(fieldValue);
          } else if (bodyKey === 'frequency') {
            // Normalize frequency values
            const frequencyMap: Record<string, string> = {
              'weekly': 'weekly',
              'bi-weekly': 'biweekly',
              'biweekly': 'biweekly',
              'four-week': 'monthly',
              'monthly': 'monthly',
              'one-time': 'one_time',
              'one time': 'one_time',
            };
            fieldValue = frequencyMap[String(fieldValue).toLowerCase()] || String(fieldValue);
          } else if (bodyKey === 'condition') {
            // Normalize condition values
            const conditionMap: Record<string, string> = {
              'excellent': 'excellent',
              'good': 'good',
              'average': 'average',
              'poor': 'poor',
              'very-poor': 'very_poor',
              'very poor': 'very_poor',
            };
            fieldValue = conditionMap[String(fieldValue).toLowerCase()] || String(fieldValue);
          }
          
          mappedFieldsCount++;
          
          // Handle native fields (firstName, lastName, email, phone, address1, city, state, postalCode, country)
          // Check if mapping is a native field - strip prefix first to check
          const mappingWithoutPrefix = mapping.replace(/^(contact|opportunity)\./, '');
          const isNativeField = nativeFieldList.includes(mappingWithoutPrefix);
          
          if (isNativeField) {
            // Map address -> address1 for consistency with GHL API
            const nativeFieldName = mappingWithoutPrefix === 'address' ? 'address1' : mappingWithoutPrefix;
            // Use parsed components for native address fields so full address is not dumped into street line
            if (nativeFieldName === 'address1' && (bodyKey === 'address' || bodyKey === 'address1')) {
              contactData.address1 = parsedStreetAddress || String(fieldValue);
            } else if (nativeFieldName === 'city' && bodyKey === 'city') {
              contactData.city = parsedCity || String(fieldValue);
            } else if (nativeFieldName === 'state' && bodyKey === 'state') {
              contactData.state = parsedState || String(fieldValue);
            } else if (nativeFieldName === 'postalCode' && bodyKey === 'postalCode') {
              contactData.postalCode = parsedPostalCode || String(fieldValue);
            } else {
              contactData[nativeFieldName] = String(fieldValue);
            }
          } else {
            // Custom field with explicit admin-set mapping
            // GHL API expects just the field key without "contact." or "opportunity." prefix
            // Strip prefix if present to ensure compatibility with GHL API
            const cleanedMapping = mapping.replace(/^(contact|opportunity)\./, '');
            contactData.customFields![cleanedMapping] = String(fieldValue);
          }
        });

        // Always send shedding pets and people to GHL when mapped (even when 0), so GHL has the value
        const alwaysIncludeNumeric: Array<{ bodyKey: string; defaultValue: number }> = [
          { bodyKey: 'sheddingPets', defaultValue: 0 },
          { bodyKey: 'people', defaultValue: 0 },
        ];
        alwaysIncludeNumeric.forEach(({ bodyKey, defaultValue }) => {
          const mapping = fieldIdToMapping.get(bodyKey) || fieldIdToMapping.get(bodyKey.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, ''));
          if (!mapping) return;
          const value = body[bodyKey];
          const num = typeof value === 'number' && !isNaN(value) ? value : (typeof value === 'string' ? parseInt(value, 10) : defaultValue);
          const finalValue = !isNaN(num) ? num : defaultValue;
          const cleanedMapping = mapping.replace(/^(contact|opportunity)\./, '');
          if (!nativeFieldList.includes(cleanedMapping)) {
            contactData.customFields = contactData.customFields || {};
            contactData.customFields[cleanedMapping] = String(finalValue);
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
          }
        }

        // Remove customFields if empty
        if (Object.keys(contactData.customFields || {}).length === 0) {
          delete contactData.customFields;
        }

        // If contact was already created after email step, update it with address + quote data. Otherwise upsert.
        const contact = ghlContactId
          ? await updateContact(
              ghlContactId,
              contactData,
              ghlToken ?? undefined,
              ghlLocationId ?? undefined,
              ghlConfig?.inServiceTags
            )
          : await createOrUpdateContact(
              contactData,
              ghlToken ?? undefined,
              ghlLocationId ?? undefined,
              ghlConfig?.inServiceTags
            );

        if (!contact || !contact.id) {
          console.error('Contact create/update failed - no contact ID returned:', contact);
          throw new Error('Failed to create/update contact - no contact ID returned');
        }

        ghlContactId = contact.id;

        // Prepare promises for parallel execution (opportunity, custom object, note)
        let opportunityPromise: Promise<any> | null = null;
        let quoteObjectPromise: Promise<any> | null = null;
        let notePromise: Promise<any> | null = null;

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
          }

          // Resolve pipeline and stage using routing rules
          let resolvedPipelineId = ghlConfig.pipelineId;
          let resolvedPipelineStageId = ghlConfig.pipelineStageId;
          let resolvedOpportunityStatus = (ghlConfig.opportunityStatus as 'open' | 'won' | 'lost' | 'abandoned') || 'open';
          let resolvedOpportunityAssignedTo = ghlConfig.opportunityAssignedTo;
          let resolvedOpportunitySource = ghlConfig.opportunitySource;
          let resolvedOpportunityTags = ghlConfig.opportunityTags;
          
          if (ghlConfig.pipelineRoutingRules && Array.isArray(ghlConfig.pipelineRoutingRules) && ghlConfig.pipelineRoutingRules.length > 0) {
            for (const rule of ghlConfig.pipelineRoutingRules) {
              // Get the UTM value to check
              let raw: string;
              if (rule.utmParam === 'utm_source') {
                raw = utmParams.utm_source || '';
              } else {
                raw = utmParams[rule.utmParam as keyof typeof utmParams] || '';
              }
              
              const v = String(raw).toLowerCase();
              const needle = String(rule.value || '').toLowerCase();
              let matches = false;
              
              if (rule.match === 'contains') {
                matches = v.includes(needle);
              } else if (rule.match === 'equals') {
                matches = v === needle;
              } else if (rule.match === 'starts_with') {
                matches = v.startsWith(needle);
              }
              
              if (matches) {
                resolvedPipelineId = rule.pipelineId;
                resolvedPipelineStageId = rule.pipelineStageId;
                
                // Apply per-rule opportunity settings if configured
                if (rule.opportunityStatus) {
                  resolvedOpportunityStatus = rule.opportunityStatus as 'open' | 'won' | 'lost' | 'abandoned';
                }
                if (rule.opportunityAssignedTo) {
                  resolvedOpportunityAssignedTo = rule.opportunityAssignedTo;
                }
                if (rule.opportunitySource) {
                  resolvedOpportunitySource = rule.opportunitySource;
                }
                if (rule.opportunityTags && rule.opportunityTags.length > 0) {
                  resolvedOpportunityTags = rule.opportunityTags;
                }
                
                break; // First match wins
              }
            }
          }

          opportunityPromise = createOpportunity(
            {
              contactId: ghlContactId,
              name: opportunityName,
              value: opportunityValue,
              pipelineId: resolvedPipelineId,
              pipelineStageId: resolvedPipelineStageId,
              status: resolvedOpportunityStatus,
              assignedTo: resolvedOpportunityAssignedTo,
              source: resolvedOpportunitySource,
              tags: resolvedOpportunityTags && resolvedOpportunityTags.length > 0 ? resolvedOpportunityTags : undefined,
              customFields: opportunityCustomFields,
            },
            ghlLocationId ?? undefined
          );
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
            
            // Map service type to GHL Type field: initial_cleaning, general_cleaning, deep_clean, move_in, move_out, recurring_cleaning.
            // Use lowercase trim for lookup so "general initial Clean" and variants match.
            const serviceTypeMap: Record<string, string> = {
              'general': 'general_cleaning',
              'general cleaning': 'general_cleaning',
              'general clean': 'general_cleaning',
              'initial': 'initial_cleaning',
              'initial cleaning': 'initial_cleaning',
              'initial clean': 'initial_cleaning',
              'general initial': 'initial_cleaning',
              'general initial clean': 'initial_cleaning',
              'general initial cleaning': 'initial_cleaning',
              'deep': 'deep_clean',
              'deep clean': 'deep_clean',
              'deep cleaning': 'deep_clean',
              'move-in': 'move_in',
              'move-in clean': 'move_in',
              'move-in cleaning': 'move_in',
              'move in': 'move_in',
              'move-out': 'move_out',
              'move-out clean': 'move_out',
              'move-out cleaning': 'move_out',
              'move out': 'move_out',
              'recurring': 'recurring_cleaning',
              'recurring cleaning': 'recurring_cleaning',
              'recurring clean': 'recurring_cleaning',
            };
            const raw = String(body.serviceType || '').toLowerCase().trim();
            const mappedServiceType = serviceTypeMap[raw] || (raw ? 'general_cleaning' : '');
            
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
            
            // Add UTM parameters for tracking (map to schema field names). Use utm_source only – never URL.
            if (effectiveUtmSource) {
              quoteCustomFields['utm_source'] = effectiveUtmSource;
            }
            if (utmParams.utm_medium) {
              quoteCustomFields['utm_medium'] = utmParams.utm_medium;
            }
            if (utmParams.utm_campaign) {
              quoteCustomFields['utm_campaign'] = utmParams.utm_campaign;
            }
            if (utmParams.utm_term) {
              quoteCustomFields['utm_term'] = utmParams.utm_term;
            }
            if (utmParams.utm_content) {
              quoteCustomFields['utm_content'] = utmParams.utm_content;
            }
            if (utmParams.gclid) {
              quoteCustomFields['gclid'] = utmParams.gclid;
            }
            
            // Sanitize all custom fields to ensure values are properly formatted
            quoteCustomFields = sanitizeCustomFields(quoteCustomFields);
            
            // Note: quote_range_low and quote_range_high are not in the schema
            // If you want to store these, you'll need to add them as fields in GHL first

            // Prepare custom object creation (will parallelize with opportunity and note)
            // Only call GHL when createQuoteObject is not explicitly disabled
            if (ghlConfig?.createQuoteObject !== false) {
              // The schemaKey should be just "quotes" (not "custom_objects.quotes")
              // The customFields keys should be just the field names (not "custom_objects.quotes.field_name")
              quoteObjectPromise = createCustomObject(
                'quotes',
                {
                  contactId: ghlContactId,
                  customFields: quoteCustomFields,
                },
                ghlLocationId ?? undefined
              );
            }
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
        }

        // Prepare note creation (will parallelize with opportunity and custom object)
        if (ghlConfig?.createNote !== false && ghlContactId) {
          let noteBody = `Quote Generated from Website Form\n\n${summaryText}`;
          const notePassthrough = ['start', 'tashiane'].filter(k => body[k] && String(body[k]).trim());
          if (notePassthrough.length) {
            noteBody += '\n\n' + notePassthrough.map(k => `${k}: ${String(body[k]).trim()}`).join(', ');
          }
          notePromise = createNote(
            { contactId: ghlContactId, body: noteBody },
            ghlLocationId ?? undefined
          );
        }

        // Execute all GHL operations in parallel for faster response
        const ghlOperations = [
          opportunityPromise,
          quoteObjectPromise,
          notePromise,
        ].filter(Boolean) as Promise<any>[];

        if (ghlOperations.length > 0) {
          const results = await Promise.allSettled(ghlOperations);
          
          // Process quote object result
          const quoteResult = quoteObjectPromise 
            ? results.find((_, idx) => ghlOperations[idx] === quoteObjectPromise)
            : null;
          
          if (quoteResult && quoteResult.status === 'fulfilled' && quoteResult.value?.id) {
            const ghlObjectId = quoteResult.value.id;
            quoteId = ghlObjectId; // For GHL-based retrieval
            ghlQuoteCreated = true;
          } else if (quoteObjectPromise) {
            // Custom object creation failed - log detailed error
            const error = quoteResult?.status === 'rejected' ? quoteResult.reason : null;
            const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
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
          }
          
          // Log other operation results
          if (opportunityPromise) {
            const oppResult = results.find((_, idx) => ghlOperations[idx] === opportunityPromise);
            if (oppResult?.status === 'rejected') {
              console.error('⚠️ Failed to create opportunity:', oppResult.reason);
            }
          }
          
          if (notePromise) {
            const noteResult = results.find((_, idx) => ghlOperations[idx] === notePromise);
            if (noteResult?.status === 'rejected') {
              console.error('⚠️ Failed to create note:', noteResult.reason);
              console.error('Note creation error details:', {
                error: noteResult.reason instanceof Error ? noteResult.reason.message : String(noteResult.reason),
                contactId: ghlContactId,
                troubleshooting: 'Ensure your API token has contacts.write scope and the contact exists in GHL',
              });
            }
          }
        }
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

    // Primary storage: Supabase. KV is used only for cache.
    const oneTimeTypes = ['move-in', 'move-out', 'deep'];
    const storedFrequency = oneTimeTypes.includes(String(body.serviceType || '').toLowerCase()) ? '' : (body.frequency ?? '');
    const selectedRange = getSelectedQuoteRange(result.ranges, body.serviceType, body.frequency);
    const payload = {
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
      frequency: storedFrequency,
      createdAt: new Date().toISOString(),
      ghlQuoteCreated,
      generatedQuoteId,
      quoteCustomFields: Object.keys(quoteCustomFields).length > 0 ? quoteCustomFields : undefined,
      ...(toolId && { toolId }),
    };

    try {
      const supabase = createSupabaseServer();
      // @ts-expect-error Supabase generated types may not include quotes table yet
      const { error } = await supabase.from('quotes').insert({
        quote_id: generatedQuoteId,
        tool_id: toolId || null,
        first_name: body.firstName || null,
        last_name: body.lastName || null,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        postal_code: body.postalCode || null,
        country: body.country || null,
        service_type: body.serviceType || null,
        frequency: storedFrequency || null,
        price_low: selectedRange?.low ?? null,
        price_high: selectedRange?.high ?? null,
        square_feet: String(body.squareFeet ?? ''),
        bedrooms: Number(body.bedrooms) || null,
        full_baths: Number(body.fullBaths) || null,
        half_baths: Number(body.halfBaths) || null,
        summary_text: summaryText,
        payload,
        ghl_contact_id: ghlContactId || null,
        ghl_object_id: ghlQuoteCreated ? (quoteId !== generatedQuoteId ? quoteId : null) : null,
      });
      if (error) {
        console.error('❌ Failed to store quote in Supabase:', error);
      }
    } catch (sbError) {
      console.error('❌ Supabase quote insert failed:', sbError);
    }

    // Optional KV cache (1hr TTL) for faster quote page loads
    try {
      const kv = getKV();
      await kv.setex(`quote:${generatedQuoteId}`, 60 * 60, JSON.stringify(payload));
      if (ghlQuoteCreated && quoteId !== generatedQuoteId) {
        await kv.setex(`quote:${quoteId}`, 60 * 60, JSON.stringify(payload));
      }
    } catch {
      // KV is optional cache only; ignore failures
    }

    // Labels from stored survey (single source of truth) so UI changes in Survey Builder are reflected
    let serviceTypeLabel = '';
    let frequencyLabel = '';
    let serviceTypeOptions: Array<{ value: string; label: string }> = [];
    let frequencyOptions: Array<{ value: string; label: string }> = [];
    try {
      const surveyQuestions = await getSurveyQuestions(toolId);
      const { serviceTypeLabels, frequencyLabels } = getSurveyDisplayLabels(surveyQuestions);
      const st = String(body.serviceType || '').trim().toLowerCase();
      const freq = ['move-in', 'move-out', 'deep'].includes(st) ? '' : String(body.frequency ?? '').trim().toLowerCase();
      serviceTypeLabel = serviceTypeLabels[body.serviceType || ''] || serviceTypeLabels[st] || body.serviceType || '';
      frequencyLabel = freq ? (frequencyLabels[body.frequency || ''] || frequencyLabels[freq] || frequencyLabels[freq === 'biweekly' ? 'bi-weekly' : freq] || body.frequency || '') : '';
      const serviceTypeQ = surveyQuestions.find(q => q.id === 'serviceType');
      const frequencyQ = surveyQuestions.find(q => q.id === 'frequency');
      if (serviceTypeQ?.options) serviceTypeOptions = serviceTypeQ.options.filter(o => o.value?.trim()).map(o => ({ value: o.value!.trim(), label: o.label || o.value! }));
      if (frequencyQ?.options) frequencyOptions = frequencyQ.options.filter(o => o.value?.trim()).map(o => ({ value: o.value!.trim(), label: o.label || o.value! }));
    } catch {
      // Use built-in labels if survey labels fail to load
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
      serviceType: body.serviceType,
      frequency: ['move-in', 'move-out', 'deep'].includes(String(body.serviceType || '').toLowerCase()) ? '' : (body.frequency ?? ''),
      serviceTypeLabel,
      frequencyLabel,
      serviceTypeOptions,
      frequencyOptions,
      quoteId: generatedQuoteId,
      ...(quoteId !== generatedQuoteId && { ghlObjectId: quoteId }),
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
