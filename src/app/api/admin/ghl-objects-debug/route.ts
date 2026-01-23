import { NextRequest, NextResponse } from 'next/server';
import { makeGHLRequest } from '@/lib/ghl/client';
import { getGHLLocationId } from '@/lib/kv';

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
 * GET - Debug endpoint to fetch all GHL objects and their schemas
 * This helps us see the exact structure and field keys
 */
export async function GET(request: NextRequest) {
  // Temporarily disable auth for debugging - remove this in production!
  // const authResponse = authenticate(request);
  // if (authResponse) return authResponse;

  try {
    const locationId = await getGHLLocationId();
    
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID not configured' },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching all objects for location:', locationId);

    // Try multiple endpoints to list objects
    const endpointsToTry = [
      `/objects?locationId=${locationId}`,
      `/objects/${locationId}`,
      `/objects`,
      `/v2/locations/${locationId}/objects`,
    ];

    let allObjects: any[] = [];
    let successfulEndpoint = '';

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await makeGHLRequest<any>(endpoint, 'GET');
        
        // Handle different response formats
        const objects = response.objects || response.data || response.schemas || 
                       (Array.isArray(response) ? response : []);
        
        if (objects && objects.length > 0) {
          allObjects = objects;
          successfulEndpoint = endpoint;
          console.log(`✅ Successfully fetched ${objects.length} objects from: ${endpoint}`);
          break;
        }
      } catch (error) {
        console.log(`❌ Failed at ${endpoint}:`, error instanceof Error ? error.message : String(error));
        // Continue to next endpoint
      }
    }

    // If we can't list objects, try to fetch "quotes" schema directly
    if (allObjects.length === 0) {
      console.log('⚠️  Could not list objects. Trying to fetch "quotes" schema directly...');
      
      const schemaKeysToTry = ['custom_objects.quotes', 'quotes', 'Quote', 'quote'];
      const directSchemas: any[] = [];
      const errors: any[] = [];
      
      for (const schemaKey of schemaKeysToTry) {
        const schemaEndpoints = [
          `/objects/${schemaKey}?locationId=${locationId}`,
          `/objects/${schemaKey}/${locationId}`,
          `/objects/${schemaKey}`,
        ];

        for (const schemaEndpoint of schemaEndpoints) {
          try {
            console.log(`Trying to fetch schema: ${schemaEndpoint}`);
            const schemaDetails = await makeGHLRequest<any>(schemaEndpoint, 'GET');
            
            if (schemaDetails) {
              directSchemas.push({
                schemaKey,
                fields: schemaDetails.fields || schemaDetails.properties || [],
                fullSchema: schemaDetails,
              });
              console.log(`✅ Successfully fetched ${schemaKey} schema`);
              break; // Found it, move to next schema key
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.log(`   ❌ Failed at ${schemaEndpoint}:`, errorMsg);
            errors.push({
              schemaKey,
              endpoint: schemaEndpoint,
              error: errorMsg,
            });
            // Try next endpoint
          }
        }
      }
      
      if (directSchemas.length > 0) {
        return NextResponse.json({
          success: true,
          locationId,
          method: 'direct_fetch',
          message: 'Could not list all objects, but successfully fetched quote schemas directly',
          directSchemas: directSchemas.map((schema) => ({
            schemaKey: schema.schemaKey,
            fieldCount: schema.fields.length,
            fields: schema.fields.map((field: any) => ({
              key: field.key,
              name: field.name,
              id: field.id,
              type: field.type,
              required: field.required,
              // Show all field properties for debugging
              allProperties: field,
            })),
            fullSchema: schema.fullSchema,
          })),
        });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Could not fetch objects from any endpoint. The /objects endpoint may not be available or may require different authentication.',
        triedEndpoints: endpointsToTry,
        triedDirectFetch: schemaKeysToTry,
        errors: errors,
        message: 'Check the errors array above to see what went wrong with each attempt. The schema might not exist yet, or the endpoint format might be different.',
      });
    }

    // Now fetch detailed schema for each object, especially "quotes" or "Quote"
    const detailedSchemas: any[] = [];
    
    for (const obj of allObjects) {
      const schemaKey = obj.key || obj.schemaKey || obj.name || obj.id;
      if (!schemaKey) continue;

      try {
        console.log(`Fetching detailed schema for: ${schemaKey}`);
        const schemaEndpoints = [
          `/objects/${schemaKey}?locationId=${locationId}`,
          `/objects/${schemaKey}/${locationId}`,
          `/objects/${schemaKey}`,
        ];

        let schemaDetails: any = null;
        for (const schemaEndpoint of schemaEndpoints) {
          try {
            schemaDetails = await makeGHLRequest<any>(schemaEndpoint, 'GET');
            break;
          } catch (error) {
            // Try next endpoint
          }
        }

        if (schemaDetails) {
          detailedSchemas.push({
            schemaKey,
            name: obj.name,
            id: obj.id,
            fields: schemaDetails.fields || schemaDetails.properties || [],
            fullSchema: schemaDetails,
          });
        }
      } catch (error) {
        console.log(`Could not fetch schema for ${schemaKey}:`, error instanceof Error ? error.message : String(error));
      }
    }

    // Look specifically for quote-related objects
    const quoteObjects = allObjects.filter((obj: any) => {
      const key = (obj.key || obj.schemaKey || obj.name || '').toLowerCase();
      return key.includes('quote');
    });

    const result = {
      success: true,
      locationId,
      successfulEndpoint,
      totalObjects: allObjects.length,
      allObjects: allObjects.map((obj: any) => ({
        key: obj.key || obj.schemaKey,
        name: obj.name,
        id: obj.id,
        displayName: obj.displayName,
      })),
      quoteObjects: quoteObjects.map((obj: any) => ({
        key: obj.key || obj.schemaKey,
        name: obj.name,
        id: obj.id,
      })),
      detailedSchemas: detailedSchemas.map((schema: any) => ({
        schemaKey: schema.schemaKey,
        name: schema.name,
        fieldCount: schema.fields.length,
        fields: schema.fields.map((field: any) => ({
          key: field.key,
          name: field.name,
          id: field.id,
          type: field.type,
          required: field.required,
          // Show all field properties for debugging
          allProperties: field,
        })),
      })),
    };

    console.log('📊 Objects Debug Result:', JSON.stringify(result, null, 2));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching objects:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
