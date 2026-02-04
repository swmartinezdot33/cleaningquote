import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import { makeGHLRequest } from '@/lib/ghl/client';
import { getSurveyQuestions } from '@/lib/survey/manager';
import { SurveyQuestion } from '@/lib/survey/schema';
import { requireAdminAuth } from '@/lib/security/auth';

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic';

/**
 * GET - Test custom fields mapping with detailed logging
 * Returns all logs in the response so you don't need to check server logs
 */
export async function GET(request: NextRequest) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) return authResponse;

  const logs: string[] = [];
  const errors: any[] = [];
  const results: any = {};

  const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.push(logEntry);
    if (data) {
      logs.push(`  Data: ${JSON.stringify(data, null, 2)}`);
    }
    console.log(logEntry, data || '');
  };

  try {
    log('🔍 Starting GHL Custom Fields Mapping Test');

    const locationId = await getGHLLocationId();
    const token = await getGHLToken();

    if (!locationId) {
      return NextResponse.json({
        success: false,
        error: 'Location ID not configured',
        logs,
      }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'GHL token not configured',
        logs,
      }, { status: 400 });
    }

    log(`✅ Location ID: ${locationId}`);
    log(`✅ Token configured: ${token.substring(0, 10)}...${token.substring(token.length - 4)}`);

    // Step 1: Fetch GHL custom fields
    log('\n📋 Step 1: Fetching GHL Custom Fields...');
    let ghlCustomFields: any[] = [];
    try {
      const response = await fetch(
        `https://services.leadconnectorhq.com/locations/${locationId}/customFields?model=contact`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Handle different response structures
        if (Array.isArray(data)) {
          ghlCustomFields = data;
        } else if (data.customFields && Array.isArray(data.customFields)) {
          ghlCustomFields = data.customFields;
        } else if (data.data && Array.isArray(data.data)) {
          ghlCustomFields = data.data;
        } else if (data.fields && Array.isArray(data.fields)) {
          ghlCustomFields = data.fields;
        }

        log(`✅ Found ${ghlCustomFields.length} GHL custom fields`);
        
        // Format and display custom fields
        const formattedFields = ghlCustomFields.map((field: any) => {
          const key = field.key || field.fieldKey || field.id || field._id || field.fieldId;
          const name = field.name || field.label || field.title || 'Unnamed Field';
          const type = field.dataType || field.type || 'text';
          
          return {
            key: key?.trim() || 'INVALID',
            name: name?.trim() || 'Unnamed',
            type: type,
            raw: field,
          };
        }).filter((f: any) => f.key !== 'INVALID');

        log('GHL Custom Fields:', formattedFields);
        results.ghlCustomFields = formattedFields;
        results.ghlCustomFieldsCount = formattedFields.length;
      } else {
        const errorText = await response.text();
        log(`❌ Failed to fetch GHL custom fields: ${response.status} ${response.statusText}`);
        log(`Error response: ${errorText}`);
        errors.push({ step: 'fetch_ghl_fields', status: response.status, error: errorText });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`❌ Error fetching GHL custom fields: ${errorMsg}`);
      errors.push({ step: 'fetch_ghl_fields', error: errorMsg });
    }

    // Step 2: Fetch survey questions
    log('\n📋 Step 2: Fetching Survey Questions...');
    let surveyQuestions: SurveyQuestion[] = [];
    try {
      surveyQuestions = await getSurveyQuestions();
      log(`✅ Found ${surveyQuestions.length} survey questions`);
      
      // Analyze mappings
      const questionsWithMappings = surveyQuestions.filter(q => q.ghlFieldMapping && q.ghlFieldMapping.trim() !== '');
      const questionsWithoutMappings = surveyQuestions.filter(q => !q.ghlFieldMapping || q.ghlFieldMapping.trim() === '');
      
      log(`📊 Mapping Analysis:`);
      log(`  - Questions with mappings: ${questionsWithMappings.length}`);
      log(`  - Questions without mappings: ${questionsWithoutMappings.length}`);
      
      // Build mapping map
      const fieldIdToMapping = new Map<string, string>();
      surveyQuestions.forEach((question: SurveyQuestion) => {
        if (question.ghlFieldMapping && question.ghlFieldMapping.trim() !== '') {
          fieldIdToMapping.set(question.id, question.ghlFieldMapping.trim());
          const sanitizedId = question.id.replace(/\./g, '_');
          fieldIdToMapping.set(sanitizedId, question.ghlFieldMapping.trim());
        }
      });

      log('Mappings found:', Array.from(fieldIdToMapping.entries()).map(([id, mapping]) => ({ id, mapping })));
      
      results.surveyQuestions = {
        total: surveyQuestions.length,
        withMappings: questionsWithMappings.length,
        withoutMappings: questionsWithoutMappings.length,
        questions: surveyQuestions.map(q => ({
          id: q.id,
          sanitizedId: q.id.replace(/\./g, '_'),
          label: q.label,
          type: q.type,
          hasMapping: !!(q.ghlFieldMapping && q.ghlFieldMapping.trim() !== ''),
          mapping: q.ghlFieldMapping || null,
        })),
        mappings: Array.from(fieldIdToMapping.entries()).map(([id, mapping]) => ({ id, mapping })),
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`❌ Error fetching survey questions: ${errorMsg}`);
      errors.push({ step: 'fetch_survey_questions', error: errorMsg });
    }

    // Step 3: Test field mapping logic
    log('\n📋 Step 3: Testing Field Mapping Logic...');
    
    // Simulate a typical form submission body
    const testBody = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '+1234567890',
      serviceType: 'deep',
      frequency: 'weekly',
      squareFeet: '1500',
      fullBaths: '2',
      halfBaths: '1',
      bedrooms: '3',
      people: '4',
      pets: '2',
      sheddingPets: '1',
      condition: 'good',
      hasPreviousService: true,
      cleanedWithin3Months: false,
    };

    log('Test form data:', testBody);

    // Build mapping map (same logic as in quote route)
    const fieldIdToMapping = new Map<string, string>();
    surveyQuestions.forEach((question: SurveyQuestion) => {
      if (question.ghlFieldMapping && question.ghlFieldMapping.trim() !== '') {
        fieldIdToMapping.set(question.id, question.ghlFieldMapping.trim());
        const sanitizedId = question.id.replace(/\./g, '_');
        fieldIdToMapping.set(sanitizedId, question.ghlFieldMapping.trim());
      }
    });

    // Simulate the mapping process
    const mappedFields: any[] = [];
    const skippedFields: any[] = [];
    const nativeFields: any[] = [];
    const customFields: Record<string, string> = {};

    Object.keys(testBody).forEach((bodyKey) => {
      const fieldValue = testBody[bodyKey as keyof typeof testBody];
      
      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        skippedFields.push({ field: bodyKey, reason: 'empty_value', value: fieldValue });
        return;
      }
      
      const mapping = fieldIdToMapping.get(bodyKey);
      
      if (!mapping) {
        skippedFields.push({ field: bodyKey, reason: 'no_mapping', value: fieldValue });
        return;
      }
      
      // Check if it's a native field
      const nativeFieldNames = ['firstName', 'lastName', 'email', 'phone', 'address1', 'address', 'city', 'state', 'postalCode', 'country'];
      if (nativeFieldNames.includes(mapping)) {
        const nativeFieldName = mapping === 'address' ? 'address1' : mapping;
        nativeFields.push({ field: bodyKey, mapping, nativeField: nativeFieldName, value: String(fieldValue) });
      } else {
        // Custom field
        customFields[mapping] = String(fieldValue);
        mappedFields.push({ field: bodyKey, mapping, value: String(fieldValue), type: 'custom' });
      }
    });

    log('Mapping Results:');
    log(`  - Mapped fields: ${mappedFields.length}`, mappedFields);
    log(`  - Native fields: ${nativeFields.length}`, nativeFields);
    log(`  - Skipped fields: ${skippedFields.length}`, skippedFields);
    log(`  - Custom fields object:`, customFields);

    results.mappingTest = {
      testBody,
      mappedFields,
      nativeFields,
      skippedFields,
      customFields,
      summary: {
        totalFields: Object.keys(testBody).length,
        mappedCount: mappedFields.length,
        nativeCount: nativeFields.length,
        skippedCount: skippedFields.length,
        customFieldsCount: Object.keys(customFields).length,
      },
    };

    // Step 4: Verify custom field keys exist in GHL
    log('\n📋 Step 4: Verifying Custom Field Keys in GHL...');
    const ghlFieldKeys = new Set(ghlCustomFields.map((f: any) => (f.key || f.fieldKey || f.id || '').trim()).filter(Boolean));
    const mappedCustomFieldKeys = Object.keys(customFields);
    
    const validKeys: string[] = [];
    const invalidKeys: string[] = [];
    
    mappedCustomFieldKeys.forEach(key => {
      if (ghlFieldKeys.has(key)) {
        validKeys.push(key);
      } else {
        invalidKeys.push(key);
      }
    });

    log(`Valid custom field keys: ${validKeys.length}`, validKeys);
    log(`Invalid custom field keys: ${invalidKeys.length}`, invalidKeys);
    
    // Step 4.5: Suggest potential mappings based on field name matching
    log('\n📋 Step 4.5: Suggesting Potential Field Mappings...');
    const suggestions: Array<{ questionId: string; questionLabel: string; suggestedFields: Array<{ key: string; name: string; matchScore: number }> }> = [];
    
    surveyQuestions.forEach((question: SurveyQuestion) => {
      if (!question.ghlFieldMapping || question.ghlFieldMapping.trim() === '') {
        const questionIdLower = question.id.toLowerCase();
        const questionLabelLower = question.label.toLowerCase();
        
        // Find matching GHL fields based on keywords
        const matchingFields: Array<{ key: string; name: string; matchScore: number }> = [];
        
        ghlCustomFields.forEach((ghlField: any) => {
          const fieldKey = (ghlField.key || ghlField.fieldKey || '').trim().toLowerCase();
          const fieldName = (ghlField.name || '').trim().toLowerCase();
          
          let score = 0;
          
          // Exact ID match (highest priority)
          if (fieldKey.includes(questionIdLower.replace(/[^a-z0-9]/g, '_'))) {
            score += 100;
          }
          
          // Keyword matching
          const keywords: string[] = [];
          if (questionIdLower.includes('bedroom')) keywords.push('bedroom', 'bed');
          if (questionIdLower.includes('bath')) keywords.push('bath', 'bathroom');
          if (questionIdLower.includes('full')) keywords.push('full');
          if (questionIdLower.includes('half')) keywords.push('half');
          if (questionIdLower.includes('people')) keywords.push('people', 'person', 'residents');
          if (questionIdLower.includes('pet')) keywords.push('pet', 'pets', 'animal');
          if (questionIdLower.includes('shedding')) keywords.push('shedding', 'shed');
          if (questionIdLower.includes('square') || questionIdLower.includes('sqft') || questionIdLower.includes('sq')) {
            keywords.push('square', 'sqft', 'sq', 'feet', 'footage');
          }
          if (questionIdLower.includes('condition')) keywords.push('condition', 'state', 'clean');
          if (questionIdLower.includes('service') || questionIdLower.includes('type')) {
            keywords.push('service', 'type', 'cleaning');
          }
          if (questionIdLower.includes('frequency')) keywords.push('frequency', 'often', 'recurring');
          
          keywords.forEach(keyword => {
            if (fieldKey.includes(keyword) || fieldName.includes(keyword)) {
              score += 10;
            }
          });
          
          // Native field matching
          if (questionIdLower === 'firstname' && fieldKey === 'firstname') score += 50;
          if (questionIdLower === 'lastname' && fieldKey === 'lastname') score += 50;
          if (questionIdLower === 'email' && fieldKey === 'email') score += 50;
          if (questionIdLower === 'phone' && fieldKey === 'phone') score += 50;
          if (questionIdLower === 'address' && (fieldKey === 'address1' || fieldKey === 'address')) score += 50;
          
          if (score > 0) {
            matchingFields.push({
              key: ghlField.key || ghlField.fieldKey || '',
              name: ghlField.name || 'Unnamed',
              matchScore: score,
            });
          }
        });
        
        // Sort by match score and take top 5
        matchingFields.sort((a, b) => b.matchScore - a.matchScore);
        const topMatches = matchingFields.slice(0, 5);
        
        if (topMatches.length > 0) {
          suggestions.push({
            questionId: question.id,
            questionLabel: question.label,
            suggestedFields: topMatches,
          });
        }
      }
    });
    
    log(`💡 Found ${suggestions.length} questions with potential GHL field matches`);
    if (suggestions.length > 0) {
      log('Suggested mappings:', suggestions);
    }
    
    results.fieldValidation = {
      validKeys,
      invalidKeys,
      ghlFieldKeys: Array.from(ghlFieldKeys),
      mappedKeys: mappedCustomFieldKeys,
      suggestions,
    };

    // Step 5: Test contact creation/update (dry run - don't actually create)
    log('\n📋 Step 5: Testing Contact Payload Format...');
    
    const contactPayload = {
      firstName: testBody.firstName,
      lastName: testBody.lastName,
      email: testBody.email,
      phone: testBody.phone,
      source: 'Website Quote Form',
      tags: ['Test'],
      customFields: Object.keys(customFields).length > 0 
        ? Object.entries(customFields).map(([key, value]) => ({ key, value }))
        : undefined,
    };

    log('Contact payload (dry run):', contactPayload);
    results.contactPayload = contactPayload;

    log('\n✅ Custom Fields Mapping Test Complete!');
    
    return NextResponse.json({
      success: true,
      logs,
      errors: errors.length > 0 ? errors : undefined,
      results,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`❌ Test failed: ${errorMsg}`);
    errors.push({ step: 'general', error: errorMsg });
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      logs,
      errors,
      results,
    }, { status: 500 });
  }
}

/**
 * POST - Test creating/updating a contact with custom fields
 * This actually creates a test contact in GHL
 */
export async function POST(request: NextRequest) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) return authResponse;

  const logs: string[] = [];
  const errors: any[] = [];
  const results: any = {};

  const log = (message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    logs.push(logEntry);
    if (data) {
      logs.push(`  Data: ${JSON.stringify(data, null, 2)}`);
    }
    console.log(logEntry, data || '');
  };

  try {
    const body = await request.json();
    const { testData } = body;

    log('🧪 Testing Contact Creation with Custom Fields');

    const locationId = await getGHLLocationId();
    const token = await getGHLToken();

    if (!locationId || !token) {
      return NextResponse.json({
        success: false,
        error: 'GHL token or location ID not configured',
        logs,
      }, { status: 400 });
    }

    // Build contact payload
    const contactPayload: any = {
      locationId,
      firstName: testData?.firstName || 'Test',
      lastName: testData?.lastName || 'User',
      email: testData?.email || `test-${Date.now()}@example.com`,
      phone: testData?.phone || '+1234567890',
      source: 'Custom Fields Test',
      tags: ['Test Contact'],
    };

    // Add custom fields if provided
    if (testData?.customFields && Object.keys(testData.customFields).length > 0) {
      contactPayload.customFields = Object.entries(testData.customFields).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }

    log('Contact payload:', contactPayload);

    // Create contact
    const response = await makeGHLRequest<any>(
      '/contacts/upsert',
      'POST',
      contactPayload
    );

    log('✅ Contact created/updated successfully');
    log('Response:', response);

    results.contact = response;
    results.payload = contactPayload;

    return NextResponse.json({
      success: true,
      logs,
      results,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`❌ Contact creation failed: ${errorMsg}`);
    errors.push({ step: 'create_contact', error: errorMsg });
    
    return NextResponse.json({
      success: false,
      error: errorMsg,
      logs,
      errors,
      results,
    }, { status: 500 });
  }
}
