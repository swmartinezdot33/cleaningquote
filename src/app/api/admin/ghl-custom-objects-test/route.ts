import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import { makeGHLRequest, listObjectSchemas, getObjectSchema, createCustomObject } from '@/lib/ghl/client';

// Force dynamic rendering since we use request headers
export const dynamic = 'force-dynamic';

function authenticate(request: NextRequest): NextResponse | null {
  const password = request.headers.get('x-admin-password');
  const requiredPassword = process.env.ADMIN_PASSWORD;

  if (requiredPassword && password !== requiredPassword) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing password.' },
      { status: 401 }
    );
  }
  return null;
}

/**
 * GET - Test custom objects endpoint with detailed logging
 * Returns all logs in the response so you don't need to check server logs
 */
export async function GET(request: NextRequest) {
  const authResponse = authenticate(request);
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
    log('🔍 Starting GHL Custom Objects Test');

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

    // Step 1: List all object schemas
    log('\n📋 Step 1: Listing all object schemas...');
    try {
      const schemas = await listObjectSchemas(locationId);
      log(`Found ${schemas.length} object schemas`);
      
      if (schemas.length > 0) {
        log('Schema keys:', schemas.map((s: any) => s.key || s.schemaKey || s.name || s.id));
        
        const quoteSchemas = schemas.filter((s: any) => {
          const key = (s.key || s.schemaKey || s.name || '').toLowerCase();
          return key.includes('quote');
        });
        
        if (quoteSchemas.length > 0) {
          log(`✅ Found ${quoteSchemas.length} quote-related schema(s):`, quoteSchemas);
          results.quoteSchemas = quoteSchemas;
        } else {
          log('⚠️ No quote schemas found in list');
        }
      } else {
        log('⚠️ No schemas returned (endpoint may not be available)');
      }
      
      results.allSchemas = schemas;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`❌ Failed to list schemas: ${errorMsg}`);
      errors.push({ step: 'list_schemas', error: errorMsg });
    }

    // Step 2: Try to fetch quote schema directly
    log('\n📋 Step 2: Fetching quote schema directly...');
    const schemaKeysToTry = ['custom_objects.quotes', 'quotes', 'Quote', 'quote'];
    let foundSchema: any = null;
    let foundSchemaKey: string | null = null;

    for (const schemaKey of schemaKeysToTry) {
      try {
        log(`Trying schema key: ${schemaKey}`);
        const schema = await getObjectSchema(schemaKey, locationId);
        
        if (schema) {
          log(`✅ Successfully fetched schema: ${schemaKey}`);
          log(`Schema structure:`, {
            hasObject: !!schema.object,
            hasFields: !!schema.fields,
            fieldCount: schema.fields?.length || 0,
            objectId: schema.object?.id,
            objectKey: schema.object?.key,
          });
          
          if (schema.fields) {
            log(`Fields:`, schema.fields.map((f: any) => ({
              key: f.key || f.fieldKey,
              name: f.name,
              id: f.id,
              type: f.dataType || f.type,
            })));
          }
          
          foundSchema = schema;
          foundSchemaKey = schemaKey;
          results.quoteSchema = {
            schemaKey,
            objectId: schema.object?.id,
            objectKey: schema.object?.key,
            fieldCount: schema.fields?.length || 0,
            fields: schema.fields?.map((f: any) => ({
              key: f.key || f.fieldKey,
              name: f.name,
              id: f.id,
              type: f.dataType || f.type,
            })) || [],
          };
          break;
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        log(`❌ Failed to fetch ${schemaKey}: ${errorMsg}`);
        errors.push({ step: 'fetch_schema', schemaKey, error: errorMsg });
      }
    }

    if (!foundSchema) {
      log('⚠️ Could not fetch quote schema from any key');
    }

    // Step 3: Test creating a custom object
    log('\n📋 Step 3: Testing custom object creation...');
    
    if (!foundSchema) {
      log('⚠️ Skipping creation test - no schema found');
      return NextResponse.json({
        success: false,
        error: 'Could not find quote schema. Please create a "Quote" custom object in GHL first.',
        logs,
        errors,
        results,
      });
    }

    // Prepare test data - use field names that match the actual schema
    // Based on the schema, we have: quote_id, service_address, square_footage, type, frequency, etc.
    // Note: createCustomObject will automatically format MULTIPLE_OPTIONS as arrays
    // So we can pass 'type' as a string and it will be converted to ['deep_clean']
    const testData = {
      customFields: {
        quote_id: `test-${Date.now()}`,
        type: 'deep_clean', // Will be converted to ['deep_clean'] by createCustomObject (MULTIPLE_OPTIONS)
        frequency: 'one_time', // SINGLE_OPTIONS - kept as string
        square_footage: '1500', // TEXT field
        // Only include fields that exist in the schema
      },
    };

    log('Test payload:', testData);

    // Use createCustomObject function which handles field mapping and formatting
    log(`Will use createCustomObject function to handle field mapping and formatting`);

    let creationSuccess = false;
    let creationResult: any = null;
    let lastCreationError: any = null;

    try {
      log(`\nAttempting creation using createCustomObject function...`);
      log(`This will automatically:`);
      log(`  - Map field names to schema field keys`);
      log(`  - Format MULTIPLE_OPTIONS fields as arrays`);
      log(`  - Format NUMERICAL fields as numbers`);
      log(`  - Try both short names and full paths`);
      log(`  - Try different endpoint variations`);

      const result = await createCustomObject(
        'quotes', // Schema key
        {
          customFields: testData.customFields,
        },
        locationId
      );
      
      log(`✅ Successfully created custom object!`);
      log(`Result:`, result);
      
      creationSuccess = true;
      creationResult = {
        objectId: result.id,
        response: result,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`❌ Failed to create custom object: ${errorMsg}`);
      lastCreationError = {
        error: errorMsg,
      };
      errors.push({ step: 'create_object', error: errorMsg });
    }

    if (creationSuccess) {
      log('\n✅ Custom object creation test PASSED!');
      results.creation = {
        success: true,
        ...creationResult,
      };
    } else {
      log('\n❌ Custom object creation test FAILED');
      results.creation = {
        success: false,
        lastError: lastCreationError,
      };
    }

    // Step 4: Test different endpoint variations
    log('\n📋 Step 4: Testing endpoint variations...');
    const endpointTests: any[] = [];

    const endpointsToTest = [
      `/objects/${foundSchema.object?.id || 'quotes'}/records`,
      `/objects/quotes/records`,
      `/objects/Quote/records`,
      `/custom-objects/quotes/records`,
      `/custom-objects/Quote/records`,
    ];

    for (const endpoint of endpointsToTest) {
      try {
        log(`Testing endpoint: ${endpoint}`);
        // Use a valid field from the schema for testing (short name format for object ID endpoint)
        const testPayload = {
          locationId,
          properties: { 
            'quote_id': `test-endpoint-${Date.now()}` 
          },
        };

        const response = await makeGHLRequest<any>(endpoint, 'POST', testPayload);
        endpointTests.push({
          endpoint,
          success: true,
          response,
        });
        log(`✅ ${endpoint} - SUCCESS`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        endpointTests.push({
          endpoint,
          success: false,
          error: errorMsg,
        });
        log(`❌ ${endpoint} - FAILED: ${errorMsg}`);
      }
    }

    results.endpointTests = endpointTests;

    return NextResponse.json({
      success: creationSuccess,
      summary: {
        schemasFound: results.allSchemas?.length || 0,
        quoteSchemaFound: !!foundSchema,
        creationSuccess,
        endpointTestsPassed: endpointTests.filter(t => t.success).length,
        endpointTestsTotal: endpointTests.length,
      },
      logs,
      errors: errors.length > 0 ? errors : undefined,
      results,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`❌ Fatal error: ${errorMsg}`);
    if (error instanceof Error && error.stack) {
      log(`Stack trace: ${error.stack}`);
    }

    return NextResponse.json({
      success: false,
      error: errorMsg,
      logs,
      errors: [...errors, { step: 'fatal', error: errorMsg }],
      results,
    }, { status: 500 });
  }
}

/**
 * POST - Test creating a custom object with custom data
 */
export async function POST(request: NextRequest) {
  const authResponse = authenticate(request);
  if (authResponse) return authResponse;

  const logs: string[] = [];
  const errors: any[] = [];

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
    const { objectType = 'quotes', customFields } = body;

    log('🧪 Testing custom object creation with provided data');
    log(`Object type: ${objectType}`);
    log(`Custom fields:`, customFields);

    const locationId = await getGHLLocationId();
    if (!locationId) {
      return NextResponse.json({
        success: false,
        error: 'Location ID not configured',
        logs,
      }, { status: 400 });
    }

    log(`Location ID: ${locationId}`);

    // Try to create the custom object
    try {
      const result = await createCustomObject(objectType, {
        customFields: customFields || {},
      }, locationId);

      log('✅ Custom object created successfully!');
      log('Result:', result);

      return NextResponse.json({
        success: true,
        result,
        logs,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log(`❌ Failed to create custom object: ${errorMsg}`);
      
      if (error instanceof Error && error.stack) {
        log(`Stack trace: ${error.stack}`);
      }

      return NextResponse.json({
        success: false,
        error: errorMsg,
        logs,
        errors: [{ step: 'create', error: errorMsg }],
      }, { status: 500 });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log(`❌ Fatal error: ${errorMsg}`);

    return NextResponse.json({
      success: false,
      error: errorMsg,
      logs,
      errors: [{ step: 'fatal', error: errorMsg }],
    }, { status: 500 });
  }
}
