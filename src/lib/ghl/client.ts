/**
 * GoHighLevel API Client
 * Handles all communication with GoHighLevel CRM API
 */

import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import {
  GHLContact,
  GHLContactResponse,
  GHLOpportunity,
  GHLOpportunityResponse,
  GHLNote,
  GHLNoteResponse,
  GHLAppointment,
  GHLAppointmentResponse,
  GHLLocation,
  GHLPipeline,
  GHLAPIError,
  GHLConnectionTestResult,
  GHLCustomObject,
  GHLCustomObjectResponse,
} from './types';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/**
 * Make authenticated request to GHL API
 */
export async function makeGHLRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, any>
): Promise<T> {
  try {
    const token = await getGHLToken();

    if (!token || typeof token !== 'string') {
      throw new Error('GHL API token not configured. Please set it in the admin settings.');
    }

    const url = `${GHL_API_BASE}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28', // GHL 2.0 API version
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Read response text once (can only read body once)
    const responseText = await response.text();

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `GHL API Error (${response.status})`;
      let errorData: any = null;
      
      if (responseText && responseText.trim().length > 0) {
        try {
          errorData = JSON.parse(responseText) as GHLAPIError;
          errorMessage = `${errorMessage}: ${errorData.message || errorData.error || JSON.stringify(errorData)}`;
        } catch (parseError) {
          // Response is not valid JSON, include raw text
          errorMessage = `${errorMessage}: ${responseText.substring(0, 200)}`;
        }
      } else {
        errorMessage = `${errorMessage}: Empty response from GHL API`;
      }
      
      // Enhanced error logging for 400/404 errors to help debug
      if (response.status === 400 || response.status === 404) {
        console.error(`GHL API ${response.status} Error Details:`, {
          url,
          status: response.status,
          statusText: response.statusText,
          responseText: responseText || '(empty)',
          errorData: errorData || '(not JSON)',
          method: options.method || 'GET',
          payload: (options.method === 'POST' && body) ? {
            hasLocationId: !!body.locationId,
            locationId: body.locationId,
            hasContactId: !!body.contactId,
            customFieldsCount: body.customFields?.length || 0,
            customFieldsKeys: body.customFields?.map((f: any) => f.key) || [],
            customFieldsSample: body.customFields?.slice(0, 3) || [],
          } : undefined,
        });
      }
      
      throw new Error(errorMessage);
    }

    // Parse successful response
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from GHL API');
    }

    let data;
    try {
      data = JSON.parse(responseText) as T;
    } catch (parseError) {
      console.error('Failed to parse GHL API response:', parseError);
      console.error('Response text:', responseText.substring(0, 500));
      throw new Error('Invalid response from GHL API - could not parse JSON');
    }

    return data;
  } catch (error) {
    console.error('GHL API request failed:', error);
    throw error;
  }
}

/**
 * Create or update a contact in GHL using the upsert endpoint
 * The GHL /contacts/upsert endpoint automatically:
 * - Checks if contact exists by email (primary) and phone (secondary)
 * - Updates the contact if found
 * - Creates a new contact if not found
 * 
 * This ensures contacts are deduplicated and never duplicated
 * Always uses stored locationId for sub-account (location-level) API calls
 */
export async function createOrUpdateContact(
  contactData: GHLContact,
  token?: string,
  locationId?: string,
  additionalTags?: string[]
): Promise<GHLContactResponse> {
  try {
    // Use provided token or get from stored settings
    const finalToken = token || (await getGHLToken());
    
    // Always use locationId - required for sub-account (location-level) API calls
    // Use provided locationId, or get from stored settings (required)
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    // Combine contact tags with additional tags (e.g., service area tags)
    const allTags = [
      ...(contactData.tags || []),
      ...(additionalTags || []),
    ];

    // Validate required fields
    if (!finalToken) {
      throw new Error('GHL API token is required but not configured');
    }
    
    if (!finalLocationId) {
      throw new Error('Location ID is required but not configured');
    }

    // Convert customFields object to array format required by GHL API
    // GHL expects: [{ key: "fieldKey", value: "fieldValue" }, ...]
    // We have: { fieldKey: "fieldValue", ... }
    let customFieldsArray: Array<{ key: string; value: string }> | undefined;
    if (contactData.customFields && Object.keys(contactData.customFields).length > 0) {
      customFieldsArray = Object.entries(contactData.customFields).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }

    const payload: Record<string, any> = {
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      locationId: finalLocationId, // locationId must be in the request body, not URL path
      ...(contactData.email && { email: contactData.email }),
      ...(contactData.phone && { phone: contactData.phone }),
      ...(contactData.address1 && { address1: contactData.address1 }),
      ...(contactData.city && { city: contactData.city }),
      ...(contactData.state && { state: contactData.state }),
      ...(contactData.postalCode && { postalCode: contactData.postalCode }),
      ...(contactData.country && { country: contactData.country }),
      ...(contactData.source && { source: contactData.source }),
      ...(allTags.length > 0 && { tags: allTags }),
      ...(customFieldsArray && customFieldsArray.length > 0 && {
        customFields: customFieldsArray,
      }),
    };

    // Use provided token or the API client token
    // GHL 2.0 API: Use upsert endpoint - locationId is in the request body
    const url = `${GHL_API_BASE}/contacts/upsert`;
    
    console.log('Making GHL upsert contact request:', {
      url,
      hasToken: !!finalToken,
      tokenLength: finalToken?.length || 0,
      locationId: finalLocationId,
      payload: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        hasEmail: !!payload.email,
        hasPhone: !!payload.phone,
        tagsCount: payload.tags?.length || 0,
        customFieldsCount: Object.keys(payload.customFields || {}).length,
      },
    });
    
    const options: RequestInit = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28', // GHL 2.0 API version
      },
      body: JSON.stringify(payload),
    };

    const response = await fetch(url, options);

    // Read response text once (can only read body once)
    const responseText = await response.text();

    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `GHL API Error (${response.status})`;
      let errorData: any = null;
      
      if (responseText && responseText.trim().length > 0) {
        try {
          errorData = JSON.parse(responseText);
          errorMessage = `${errorMessage}: ${errorData.message || errorData.error || JSON.stringify(errorData)}`;
        } catch (parseError) {
          // Response is not valid JSON, include raw text
          errorMessage = `${errorMessage}: ${responseText.substring(0, 200)}`;
        }
      } else {
        errorMessage = `${errorMessage}: Empty response from GHL API`;
      }
      
      // Enhanced error logging for 400/404 errors
      if (response.status === 400 || response.status === 404) {
        console.error(`GHL API ${response.status} Error:`, {
          url,
          status: response.status,
          statusText: response.statusText,
          responseText: responseText || '(empty)',
          errorData: errorData || '(not JSON)',
          method: options.method || 'GET',
          payload: (options.method === 'POST' && payload) ? {
            hasLocationId: !!payload.locationId,
            locationId: payload.locationId,
            hasContactId: !!payload.contactId,
            customFieldsCount: payload.customFields?.length || 0,
            customFieldsKeys: payload.customFields?.map((f: any) => f.key) || [],
          } : undefined,
        });
      }
      
      throw new Error(errorMessage);
    }

    // Parse successful response
    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from GHL API');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse GHL API response:', parseError);
      console.error('Response text:', responseText.substring(0, 500));
      throw new Error('Invalid response from GHL API - could not parse JSON');
    }

    // Log the full response structure for debugging
    console.log('GHL API upsert contact response:', JSON.stringify(data, null, 2));

    // Handle different response structures
    // GHL API might return { contact: { id: ... } } or { id: ... } directly
    const contact = data.contact || data;
    
    if (!contact || !contact.id) {
      console.error('GHL API response missing contact or contact.id:', data);
      throw new Error('Invalid response from GHL API - missing contact or contact.id');
    }

    return contact;
  } catch (error) {
    console.error('Failed to create/update contact:', error);
    throw error;
  }
}

/**
 * Create an opportunity in GHL
 * Always uses stored locationId for sub-account (location-level) API calls
 */
export async function createOpportunity(
  opportunityData: GHLOpportunity,
  locationId?: string
): Promise<GHLOpportunityResponse> {
  try {
    // Always use locationId - required for sub-account (location-level) API calls
    // Use provided locationId, or get from stored settings (required)
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    // Convert customFields object to array format required by GHL API
    let customFieldsArray: Array<{ key: string; value: string }> | undefined;
    if (opportunityData.customFields && Object.keys(opportunityData.customFields).length > 0) {
      customFieldsArray = Object.entries(opportunityData.customFields).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }

    const payload: Record<string, any> = {
      contactId: opportunityData.contactId,
      name: opportunityData.name,
      locationId: finalLocationId, // locationId must be in the request body, not URL path
      ...(opportunityData.value && { monetaryValue: opportunityData.value }),
      ...(opportunityData.pipelineId && { pipelineId: opportunityData.pipelineId }),
      ...(opportunityData.pipelineStageId && {
        pipelineStageId: opportunityData.pipelineStageId,
      }),
      ...(opportunityData.status && { status: opportunityData.status }),
      ...(customFieldsArray && customFieldsArray.length > 0 && {
        customFields: customFieldsArray,
      }),
    };

    // GHL 2.0 API: Use opportunities endpoint - locationId is in the request body
    const response = await makeGHLRequest<{ opportunity: GHLOpportunityResponse }>(
      `/opportunities/`,
      'POST',
      payload
    );

    return response.opportunity || response;
  } catch (error) {
    console.error('Failed to create opportunity:', error);
    throw error;
  }
}

/**
 * Add a note to a contact in GHL
 * Note: When using a location-level token, locationId is implicit and should NOT be included
 */
export async function createNote(noteData: GHLNote, locationId?: string): Promise<GHLNoteResponse> {
  try {
    const payload = {
      body: noteData.body,
      // Note: locationId should NOT be included for notes endpoint when using location-level token
      // The location is determined from the token itself
    };

    // GHL 2.0 API: Use contacts notes endpoint
    // When using location-level token, locationId is implicit and should not be in URL or body
    const endpoint = `/contacts/${noteData.contactId}/notes`;
    const response = await makeGHLRequest<{ note: GHLNoteResponse }>(
      endpoint,
      'POST',
      payload
    );

    return response.note || response;
  } catch (error) {
    console.error('Failed to create note:', error);
    throw error;
  }
}

/**
 * Create an appointment in GHL
 * Always uses stored locationId for sub-account (location-level) API calls
 */
export async function createAppointment(
  appointmentData: GHLAppointment,
  locationId?: string
): Promise<GHLAppointmentResponse> {
  try {
    // Always use locationId - required for sub-account (location-level) API calls
    // Use provided locationId, or get from stored settings (required)
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    const payload: Record<string, any> = {
      contactId: appointmentData.contactId,
      title: appointmentData.title,
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      locationId: finalLocationId, // locationId is required in the request body
      ...(appointmentData.calendarId && { calendarId: appointmentData.calendarId }),
      ...(appointmentData.assignedTo && { assignedTo: appointmentData.assignedTo }),
      ...(appointmentData.notes && { notes: appointmentData.notes }),
    };

    console.log('Creating appointment with payload:', {
      ...payload,
      contactId: '***hidden***',
    });

    // GHL 2.0 API: Use calendars/events/appointments endpoint for creating appointments - locationId is in the request body
    const response = await makeGHLRequest<{ appointment: GHLAppointmentResponse }>(
      `/calendars/events/appointments`,
      'POST',
      payload
    );

    console.log('Appointment created successfully:', response.appointment?.id);
    return response.appointment || response;
  } catch (error) {
    console.error('Failed to create appointment:', {
      error: error instanceof Error ? error.message : String(error),
      contactId: appointmentData.contactId,
      calendarId: appointmentData.calendarId,
    });
    throw error;
  }
}

/**
 * List all object schemas to find the correct schemaKey
 * Always uses stored locationId for sub-account (location-level) API calls
 * Returns empty array if listing is not available (non-blocking)
 */
export async function listObjectSchemas(locationId?: string): Promise<any[]> {
  try {
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      // Return empty array instead of throwing - schema listing is optional
      console.log('⚠️ Location ID not available, skipping schema listing');
      return [];
    }

    // Try multiple endpoint formats for GET /objects
    // Note: The /objects endpoint may not be available in all GHL accounts or may require different scopes
    const endpointsToTry = [
      `/objects?locationId=${finalLocationId}`,  // With query param
      `/objects/${finalLocationId}`,              // With path param
      `/objects`,                                 // Without locationId (might work with token)
    ];

    let lastError: Error | null = null;
    let response: any = null;

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Attempting to list object schemas at: ${endpoint}`);
        response = await makeGHLRequest<{ objects?: any[]; data?: any[]; schemas?: any[] }>(
          endpoint,
          'GET'
        );
        console.log(`✅ Successfully retrieved object schemas from: ${endpoint}`);
        console.log('Response structure:', {
          hasObjects: !!response.objects,
          hasData: !!response.data,
          hasSchemas: !!response.schemas,
          isArray: Array.isArray(response),
          keys: Object.keys(response || {}),
        });
        break; // Success, exit loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`❌ Failed at ${endpoint}:`, lastError.message);
        // Continue to next endpoint
      }
    }

    if (!response) {
      // Don't throw - schema listing is optional and may not be available
      console.log('⚠️ Could not list object schemas (endpoint may not be available or may require different scopes). Will try common schema key variations.');
      return [];
    }

    // GHL may return { objects: [...] } or { data: [...] } or { schemas: [...] } or array directly
    const schemas = response.objects || response.data || response.schemas || (Array.isArray(response) ? response : []);
    
    console.log(`Found ${schemas.length} object schemas`);
    if (schemas.length > 0) {
      console.log('Schema keys/names:', schemas.map((s: any) => ({
        key: s.key || s.schemaKey || s.name,
        name: s.name,
        id: s.id,
      })));
    }
    
    return schemas;
  } catch (error) {
    // Don't throw - schema listing is optional
    console.log('⚠️ Schema listing failed (non-blocking):', error instanceof Error ? error.message : String(error));
    return [];
  }
}

/**
 * Get a specific object schema by key to see field definitions
 * Always uses stored locationId for sub-account (location-level) API calls
 */
export async function getObjectSchema(schemaKey: string, locationId?: string): Promise<any> {
  try {
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    // Try multiple endpoint formats for GET /objects/{schemaKey}
    // For GET requests, locationId should be in query string
    const endpointsToTry = [
      `/objects/${schemaKey}?locationId=${finalLocationId}`,  // With query param (preferred)
      `/objects/${schemaKey}`,                                 // Without locationId (might work with location-level token)
    ];

    let lastError: Error | null = null;
    let response: any = null;

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Attempting to get object schema at: ${endpoint}`);
        response = await makeGHLRequest<any>(
          endpoint,
          'GET'
        );
        console.log(`✅ Successfully retrieved object schema from: ${endpoint}`);
        console.log('Schema structure:', {
          hasFields: !!response.fields,
          hasProperties: !!response.properties,
          keys: Object.keys(response || {}),
        });
        if (response.fields) {
          console.log('Schema fields:', response.fields.map((f: any) => ({
            key: f.key || f.name,
            name: f.name,
            id: f.id,
            type: f.type,
          })));
        }
        break; // Success, exit loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`❌ Failed at ${endpoint}:`, lastError.message);
        // Continue to next endpoint
      }
    }

    if (!response) {
      console.error('All endpoint attempts failed. Last error:', lastError);
      throw lastError || new Error(`Failed to get object schema (${schemaKey}) - all endpoint variations failed`);
    }

    return response;
  } catch (error) {
    console.error(`Failed to get object schema (${schemaKey}):`, error);
    throw error;
  }
}

/**
 * Create a custom object in GHL
 * Always uses stored locationId for sub-account (location-level) API calls
 * According to GHL API docs: POST /objects/{schemaKey}/records
 */
export async function createCustomObject(
  objectType: string,
  data: GHLCustomObject,
  locationId?: string
): Promise<GHLCustomObjectResponse> {
  try {
    // Always use locationId - required for sub-account (location-level) API calls
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    // First, try to find the correct schemaKey by listing all schemas
    // Note: This is optional - if listing fails, we'll try common variations
    let actualSchemaKey: string | null = null;
    let schemaFields: any = null;
    
    try {
      console.log('Attempting to list object schemas to find correct schemaKey...');
      const schemas = await listObjectSchemas(finalLocationId);
      
      if (schemas.length > 0) {
        console.log(`Found ${schemas.length} object schemas`);
        
        // Look for Quote-related schema (case-insensitive)
        // Prioritize "quotes" (lowercase plural) as that matches GHL template format
        const quoteSchema = schemas.find((s: any) => {
          const key = (s.key || s.schemaKey || s.name || '').toLowerCase();
          return key === 'quotes' || key === 'quote' || key.includes('quote');
        });
        
        if (quoteSchema) {
          actualSchemaKey = quoteSchema.key || quoteSchema.schemaKey || quoteSchema.name;
          console.log(`✅ Found Quote schema with key: ${actualSchemaKey}`);
          
          // Try to get the full schema to see field definitions
          // We know "custom_objects.quotes" works from the debug endpoint
          try {
            schemaFields = await getObjectSchema(actualSchemaKey, finalLocationId);
            console.log('✅ Retrieved schema fields:', {
              objectId: schemaFields?.object?.id,
              objectKey: schemaFields?.object?.key,
              fieldCount: schemaFields?.fields?.length || 0,
              fieldKeys: schemaFields?.fields?.map((f: any) => f.fieldKey || f.key || f.name || f.id) || [],
              sampleFields: schemaFields?.fields?.slice(0, 5).map((f: any) => ({
                fieldKey: f.fieldKey,
                key: f.key,
                name: f.name,
                id: f.id,
                type: f.dataType || f.type,
              })) || [],
            });
          } catch (schemaError) {
            console.log('⚠️ Could not fetch schema details, trying "custom_objects.quotes" as fallback...');
            // Try direct fetch with "custom_objects.quotes" as fallback (we know this works)
            try {
              schemaFields = await getObjectSchema('custom_objects.quotes', finalLocationId);
              actualSchemaKey = 'custom_objects.quotes';
              console.log('✅ Successfully fetched schema with "custom_objects.quotes"');
            } catch (fallbackError) {
              console.log('⚠️ Direct fetch also failed');
            }
          }
        } else {
          console.log('⚠️ No Quote schema found in listed schemas. Will try common variations.');
          // Try direct fetch with known working key
          try {
            console.log('Trying direct fetch with "custom_objects.quotes"...');
            schemaFields = await getObjectSchema('custom_objects.quotes', finalLocationId);
            actualSchemaKey = 'custom_objects.quotes';
            console.log('✅ Successfully fetched schema with "custom_objects.quotes"');
          } catch (directError) {
            console.log('⚠️ Direct fetch failed, will try common variations');
          }
        }
      } else {
        console.log('⚠️ No schemas found (endpoint may not be available). Will try common schema key variations.');
        // If we can't list schemas, try to directly fetch the "quotes" schema
        // We know "custom_objects.quotes" works from the debug endpoint
        try {
          console.log('Attempting to directly fetch "custom_objects.quotes" schema...');
          schemaFields = await getObjectSchema('custom_objects.quotes', finalLocationId);
          actualSchemaKey = 'custom_objects.quotes';
          console.log('✅ Successfully fetched "custom_objects.quotes" schema directly');
        } catch (directFetchError) {
          console.log('⚠️ Could not fetch "custom_objects.quotes" schema directly, will try variations when creating record');
        }
      }
    } catch (listError) {
      // Schema listing is optional - continue with common variations
      console.log('⚠️ Could not list schemas (non-blocking), will try common variations:', listError instanceof Error ? listError.message : String(listError));
    }

    // Convert customFields object to array format required by GHL API
    // GHL expects customFields as array of { key: string, value: string }
    // The "key" should be the field key from the schema (e.g., "quote_id", not "{{ custom_objects.quotes.quote_id }}")
    // If we have schema fields, try to map our keys to the schema's field keys/IDs
    let customFieldsArray: Array<{ key: string; value: string }> | undefined;
    if (data.customFields && Object.keys(data.customFields).length > 0) {
      // Build a map of our field names to schema field keys/IDs
      const fieldMap = new Map<string, string>();
      if (schemaFields?.fields && Array.isArray(schemaFields.fields)) {
        // Create a map: our field name -> schema field key/ID
        schemaFields.fields.forEach((field: any) => {
          const fieldKey = field.key || field.name || field.id;
          if (fieldKey) {
            // Map both the exact key and normalized versions
            fieldMap.set(fieldKey.toLowerCase(), fieldKey);
            if (field.name) {
              fieldMap.set(field.name.toLowerCase().replace(/\s+/g, '_'), fieldKey);
            }
          }
        });
      }
      
      customFieldsArray = Object.entries(data.customFields).map(([ourKey, value]) => {
        // Strip the custom_objects.quotes. prefix if present (used in GHL templates, not API)
        // The API expects just the field name (e.g., "quote_id" not "custom_objects.quotes.quote_id")
        let fieldKey = ourKey;
        if (ourKey.startsWith('custom_objects.quotes.')) {
          fieldKey = ourKey.replace('custom_objects.quotes.', '');
        } else if (ourKey.startsWith('custom_objects.')) {
          // Handle other custom_objects.* prefixes
          const parts = ourKey.split('.');
          fieldKey = parts[parts.length - 1]; // Get the last part (field name)
        }
        
        // Try to find matching schema field key
        const normalizedKey = fieldKey.toLowerCase();
        const schemaFieldKey = fieldMap.get(normalizedKey) || fieldMap.get(normalizedKey.replace(/_/g, ''));
        
        // Use schema field key if found, otherwise use the stripped field key
        const finalKey = schemaFieldKey || fieldKey;
        
        return {
          key: finalKey,
          value: String(value),
        };
      });
      
      console.log('📋 Custom fields mapping:', {
        totalFields: customFieldsArray.length,
        mappedFields: customFieldsArray.filter(f => fieldMap.has(f.key.toLowerCase())).length,
        fieldKeys: customFieldsArray.map(f => f.key),
      });
    }

    // GHL API payload format for creating records
    // According to docs: POST /objects/{schemaKey}/records
    // The API expects "properties" as an object with field keys as properties
    // NOT "customFields" as an array
    // Based on user's code, field names should be without prefix (e.g., "quote_id" not "custom_objects.quotes.quote_id")
    const properties: Record<string, any> = {};
    
    if (customFieldsArray && customFieldsArray.length > 0) {
      // Convert array format to object format
      // The field keys are already cleaned (without prefix) from the mapping above
      customFieldsArray.forEach((field) => {
        properties[field.key] = field.value;
      });
    }
    
    // Build payload - locationId must be in the request body
    // Note: The error said "property contactId should not exist" at top level
    // Contact association is done via Associations API separately
    const payload: Record<string, any> = {
      locationId: finalLocationId,
      ...(Object.keys(properties).length > 0 && {
        properties: properties,
      }),
    };

    console.log('📝 Creating custom object with payload:', {
      endpoint: 'POST /objects/{schemaKey}/records',
      locationId: finalLocationId,
      hasContactId: !!data.contactId,
      customFieldsCount: customFieldsArray?.length || 0,
      customFieldsKeys: customFieldsArray?.map(f => f.key) || [],
      customFieldsFull: customFieldsArray?.map(f => ({ key: f.key, value: f.value })) || [],
      foundSchemaKey: actualSchemaKey,
      hasSchemaFields: !!schemaFields,
      schemaFieldCount: schemaFields?.fields?.length || 0,
    });

    // GHL 2.0 API: POST /objects/{schemaKey}/records
    // Based on the schema we successfully fetched, we know:
    // - The object ID is: 6973793b9743a548458387d2
    // - The internal name is: custom_objects.quotes
    // - For API, we should try object ID first, then "quotes" (without prefix)
    const schemaKeysToTry: string[] = [];
    
    // If we have schemaFields with object ID, use that first (most reliable)
    if (schemaFields?.object?.id) {
      schemaKeysToTry.push(schemaFields.object.id);
      console.log(`✅ Using object ID from schema: ${schemaFields.object.id}`);
    }
    
    // Add found schemaKey if available (might be "custom_objects.quotes" from listing)
    if (actualSchemaKey) {
      // If it's the full internal name, also try just the key part
      if (actualSchemaKey.startsWith('custom_objects.')) {
        const keyPart = actualSchemaKey.split('.').pop();
        if (keyPart) {
          schemaKeysToTry.push(keyPart); // Add "quotes"
        }
      }
      schemaKeysToTry.push(actualSchemaKey);
    }
    
    // Add common variations - prioritize "quotes" (lowercase plural) as that's what the user's code uses
    const cleanObjectType = objectType.startsWith('custom_objects.') 
      ? objectType.split('.').pop() || objectType
      : objectType;
    
    schemaKeysToTry.push(
      cleanObjectType,          // Use cleaned objectType (e.g., "quotes")
      'quotes',                 // Just the key part (lowercase plural) - most common
      'Quotes',                 // Capitalized plural
      'Quote',                  // Capitalized singular
      'quote',                  // Lowercase singular
    );
    
    // Remove duplicates
    const uniqueSchemaKeys = [...new Set(schemaKeysToTry)];
    
    let lastError: Error | null = null;
    let response: any = null;
    
    // Try each schema key
    // Based on the schema we fetched, we know:
    // - Object ID: 6973793b9743a548458387d2 (most reliable)
    // - Object key: custom_objects.quotes (for GET requests)
    // - For POST /records, we should try object ID first, then "quotes"
    for (const schemaKey of uniqueSchemaKeys) {
      const endpoint = `/objects/${schemaKey}/records`;
      
      try {
        console.log(`Attempting to create custom object at endpoint: ${endpoint} with schemaKey: ${schemaKey}`);
        console.log(`Payload:`, JSON.stringify(payload, null, 2));
        response = await makeGHLRequest<{ [key: string]: GHLCustomObjectResponse }>(
          endpoint,
          'POST',
          payload
        );
        console.log(`✅ Successfully created custom object at: ${endpoint}`);
        break; // Success, exit loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message;
        console.log(`❌ Failed at ${endpoint}:`, errorMessage);
        console.log(`   Payload sent:`, JSON.stringify(payload, null, 2));
        
        // If we get 400 "Invalid Key Passed", try next schemaKey
        // If we get 422, the payload format might be wrong
        // Continue to try next schemaKey
      }
    }
    
    if (!response) {
      // If all attempts failed with 401, it's a scope issue
      // If all failed with 404, the schemaKey doesn't exist
      // If all failed with 400 "Invalid Key Passed", it's likely the customFields keys or schema doesn't exist
      const isScopeIssue = lastError?.message.includes('401') || lastError?.message.includes('not authorized');
      const isInvalidKey = lastError?.message.includes('Invalid Key Passed') || lastError?.message.includes('400');
      const isNotFound = lastError?.message.includes('404') || lastError?.message.includes('Not Found');
      
      let errorMsg = '';
      
      if (isScopeIssue) {
        errorMsg = 'Failed to create custom object - token lacks required scope (objects/record.write). Please check your GHL API token permissions in your GHL account settings.';
      } else if (isInvalidKey) {
        errorMsg = `Failed to create custom object - "Invalid Key Passed" error. This usually means:\n` +
          `1. The Quote custom object schema doesn't exist in your GHL account (create it in Settings > Custom Objects)\n` +
          `2. The schema key is different than expected. Tried: ${uniqueSchemaKeys.join(', ')}\n` +
          `3. The field keys don't match your schema. We're using: ${customFieldsArray?.map(f => f.key).join(', ')}\n` +
          `\nTo fix:\n` +
          `- Create a custom object named "quotes" (or check the exact name in GHL)\n` +
          `- Ensure it has these fields: ${customFieldsArray?.map(f => f.key).join(', ')}\n` +
          `- The field names must match exactly (case-sensitive)`;
      } else if (isNotFound) {
        errorMsg = `Failed to create custom object - Quote schema not found. Please:\n` +
          `1. Create a "Quote" custom object in your GHL account (Settings > Custom Objects)\n` +
          `2. Ensure the object name matches one of: Quote, quote, quotes, or Quotes\n` +
          `3. Add the following fields to your Quote object: ${customFieldsArray?.map(f => f.key).join(', ')}`;
      } else {
        errorMsg = `Failed to create custom object - schemaKey "${objectType}" not found or inaccessible. Please verify:\n` +
          `1. The Quote custom object exists in your GHL account\n` +
          `2. Your API token has objects/record.write scope\n` +
          `3. The object name matches the expected format`;
      }
      
      console.error('All endpoint attempts failed. Last error:', lastError);
      throw new Error(errorMsg);
    }

    // GHL may return the object directly or wrapped in a key
    // Try to find the object in the response
    const customObject = response.record || response[objectType] || response[objectType.slice(0, -1)] || response.Quote || response;
    
    return customObject as GHLCustomObjectResponse;
  } catch (error) {
    console.error(`Failed to create custom object (${objectType}):`, error);
    throw error;
  }
}

/**
 * Get a custom object by ID from GHL
 * Always uses stored locationId for sub-account (location-level) API calls
 */
export async function getCustomObjectById(
  objectType: string,
  objectId: string,
  locationId?: string
): Promise<GHLCustomObjectResponse> {
  try {
    // Always use locationId - required for sub-account (location-level) API calls
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    // For GET requests, locationId should be in query string, not body
    // GHL 2.0 API: Try multiple endpoint formats
    // Try /objects first, then /custom-objects
    const endpointsToTry = [
      `/objects/${objectType}/${objectId}?locationId=${finalLocationId}`,
      `/objects/${objectType}/records/${objectId}?locationId=${finalLocationId}`,
      `/custom-objects/${objectType}/${objectId}?locationId=${finalLocationId}`,
      `/custom-objects/${objectType}/records/${objectId}?locationId=${finalLocationId}`,
    ];
    
    // If objectType is lowercase plural, also try capitalized singular
    if (objectType === 'quotes') {
      endpointsToTry.push(`/objects/Quote/${objectId}?locationId=${finalLocationId}`);
      endpointsToTry.push(`/objects/Quote/records/${objectId}?locationId=${finalLocationId}`);
      endpointsToTry.push(`/custom-objects/Quote/${objectId}?locationId=${finalLocationId}`);
      endpointsToTry.push(`/custom-objects/Quote/records/${objectId}?locationId=${finalLocationId}`);
    }
    
    let lastError: Error | null = null;
    let response: any = null;
    
    for (const endpoint of endpointsToTry) {
      try {
        console.log(`Attempting to get custom object at endpoint: ${endpoint}`);
        response = await makeGHLRequest<{ [key: string]: GHLCustomObjectResponse }>(
          endpoint,
          'GET'
        );
        console.log(`✅ Successfully retrieved custom object from: ${endpoint}`);
        break; // Success, exit loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`❌ Failed at ${endpoint}:`, lastError.message);
        // Continue to next endpoint
      }
    }
    
    if (!response) {
      console.error('All endpoint attempts failed. Last error:', lastError);
      throw lastError || new Error('Failed to get custom object - all endpoint variations failed');
    }

    // GHL may return the object directly or wrapped in a key
    const customObject = response[objectType] || response[objectType.slice(0, -1)] || response.Quote || response.record || response;
    
    return customObject as GHLCustomObjectResponse;
  } catch (error) {
    console.error(`Failed to get custom object (${objectType}/${objectId}):`, error);
    throw error;
  }
}

/**
 * Get locationId from token (works for both agency and location-level tokens)
 * Uses /oauth/installedLocations endpoint
 */
export async function getLocationIdFromToken(token?: string): Promise<string | null> {
  try {
    const testToken = token || await getGHLToken();
    
    if (!testToken) {
      return null;
    }

    const response = await fetch(`${GHL_API_BASE}/oauth/installedLocations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken.trim()}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
    });

    if (!response.ok) {
      return null;
    }

    // Read response text once
    const responseText = await response.text();
    if (!responseText || responseText.trim().length === 0) {
      return null;
    }

    try {
      const data = JSON.parse(responseText);
      const locations = data.locations || data.data || [];
      
      if (locations.length > 0) {
        return locations[0].id;
      }
    } catch (parseError) {
      console.error('Failed to parse locationId response:', parseError);
    }

    return null;
  } catch (error) {
    console.error('Failed to get locationId from token:', error);
    return null;
  }
}

/**
 * Get location details
 */
export async function getLocation(locationId: string): Promise<GHLLocation> {
  try {
    const response = await makeGHLRequest<{ location: GHLLocation }>(
      `/locations/${locationId}`,
      'GET'
    );

    return response.location;
  } catch (error) {
    console.error('Failed to get location:', error);
    throw error;
  }
}

/**
 * Get all pipelines for a location
 * Uses the GHL 2.0 API endpoint: /v2/locations/{locationId}/opportunities/pipelines
 */
export async function getPipelines(locationId: string): Promise<GHLPipeline[]> {
  try {
    const response = await makeGHLRequest<{ pipelines: GHLPipeline[] }>(
      `/v2/locations/${locationId}/opportunities/pipelines`,
      'GET'
    );

    return response.pipelines || [];
  } catch (error) {
    console.error('Failed to get pipelines:', error);
    throw error;
  }
}

/**
 * Create a new tag in GHL
 * Returns the created tag object
 */
export async function createTag(tagName: string): Promise<{ id: string; name: string }> {
  try {
    const finalLocationId = await getGHLLocationId();
    if (!finalLocationId) {
      throw new Error('Location ID is required');
    }

    console.log('Creating tag:', tagName);

    const response = await makeGHLRequest<any>(
      `/locations/${finalLocationId}/tags`,
      'POST',
      { name: tagName }
    );

    console.log('Tag creation response:', response);

    // Handle different response formats
    const tag = response.tag || response.data || response;
    
    if (!tag || !tag.id) {
      throw new Error('Invalid response from GHL API - no tag ID returned');
    }

    console.log('Tag created successfully:', tag.id);
    return {
      id: tag.id,
      name: tag.name || tagName,
    };
  } catch (error) {
    console.error('Failed to create tag:', error);
    throw error;
  }
}

/**
 * Test a single GHL API endpoint
 */
async function testEndpoint(
  name: string,
  endpoint: string,
  method: 'GET' | 'POST',
  token: string,
  body?: Record<string, any>
): Promise<{ name: string; success: boolean; status?: number; message: string; endpoint: string }> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
    };
    
    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${GHL_API_BASE}${endpoint}`, options);

    let message = '';
    if (response.ok) {
      message = `✅ Working - HTTP ${response.status}`;
      return { name, success: true, status: response.status, message, endpoint };
    } else if (response.status === 404) {
      message = `✅ Working (Empty) - HTTP 404 - Endpoint accessible, no data yet`;
      return { name, success: true, status: 404, message, endpoint }; // 404 means endpoint exists and is accessible
    } else if (response.status === 401) {
      message = `❌ Unauthorized - Missing or invalid token - HTTP 401`;
      return { name, success: false, status: 401, message, endpoint };
    } else if (response.status === 403) {
      message = `❌ Forbidden - Missing required scope - HTTP 403`;
      return { name, success: false, status: 403, message, endpoint };
    } else if (response.status === 400) {
      message = `✅ Working - HTTP 400 - Endpoint accessible (bad request is expected for test)`;
      return { name, success: true, status: 400, message, endpoint };
    } else if (response.status === 422) {
      message = `✅ Working - HTTP 422 - Endpoint accessible (validation error expected for test data)`;
      return { name, success: true, status: 422, message, endpoint };
    } else {
      message = `❌ Error - HTTP ${response.status}`;
      return { name, success: false, status: response.status, message, endpoint };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      name,
      success: false,
      message: `❌ Connection failed: ${errorMsg}`,
      endpoint,
    };
  }
}

/**
 * Comprehensive GHL API connection test
 * Tests all major endpoints and provides detailed feedback
 */
export async function testGHLConnectionComprehensive(token?: string): Promise<GHLConnectionTestResult> {
  try {
    const testToken = token || await getGHLToken();

    if (!testToken) {
      return { 
        success: false, 
        error: 'No token provided or found' 
      };
    }

    // Validate token format
    if (testToken.trim().length < 20) {
      return { 
        success: false, 
        error: 'Token appears to be invalid (too short)' 
      };
    }

    const locationId = await getGHLLocationId();
    
    if (!locationId) {
      return { 
        success: false, 
        error: 'Location ID is required. Please configure it in the admin settings.' 
      };
    }

    console.log(`🧪 Starting comprehensive GHL API test for location: ${locationId}`);

    // Define all endpoints to test - using the ACTUAL endpoints we use in production
    const endpointsToTest = [
      // Contacts - List (used for testing connection)
      {
        name: 'Contacts - List',
        endpoint: `/contacts?locationId=${locationId}&limit=1`,
        method: 'GET' as const,
      },
      // Contacts - Upsert (actual endpoint we use for creating/updating contacts)
      {
        name: 'Contacts - Upsert Endpoint (dry-run)',
        endpoint: `/contacts/upsert`,
        method: 'POST' as const,
        body: { locationId, firstName: 'Test', lastName: 'Contact' }, // Dry-run test payload
      },
      // Opportunities - List (used for testing - try both formats)
      {
        name: 'Opportunities - List',
        endpoint: `/opportunities?locationId=${locationId}&limit=1`,
        method: 'GET' as const,
      },
      // Opportunities - Create (actual endpoint we use)
      {
        name: 'Opportunities - Create Endpoint (dry-run)',
        endpoint: `/opportunities/`,
        method: 'POST' as const,
        body: { 
          locationId, 
          contactId: 'test-contact-id', 
          name: 'Test Opportunity - Deep Clean',
          value: 250,
          status: 'open',
          pipelineId: 'test-pipeline-id',
          pipelineStageId: 'test-stage-id',
        }, // Dry-run test payload
      },
      // Pipelines - List (actual endpoint we use)
      {
        name: 'Pipelines - List',
        endpoint: `/opportunities/pipelines?locationId=${locationId}`,
        method: 'GET' as const,
      },
      // Tags - List (actual endpoint we use)
      {
        name: 'Tags - List',
        endpoint: `/v2/locations/${locationId}/tags`,
        method: 'GET' as const,
      },
      // Calendars - List (actual endpoint we use)
      {
        name: 'Calendars - List',
        endpoint: `/calendars/?locationId=${locationId}`,
        method: 'GET' as const,
      },
      // Appointments - Create (actual endpoint we use)
      {
        name: 'Appointments - Create Endpoint (dry-run)',
        endpoint: `/calendars/events/appointments`,
        method: 'POST' as const,
        body: { 
          locationId, 
          contactId: 'test-contact-id', 
          calendarId: 'test-calendar-id',
          title: 'Deep Clean - Test Contact',
          startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          endTime: new Date(Date.now() + 86400000 + 3600000).toISOString(), // Tomorrow + 1 hour
          assignedTo: 'test-user-id',
        }, // Dry-run test payload
      },
      // Custom Fields - List (actual endpoint we use)
      {
        name: 'Custom Fields - List (Contact)',
        endpoint: `/v2/locations/${locationId}/customFields?model=contact`,
        method: 'GET' as const,
      },
      // Custom Fields - List (Opportunity)
      {
        name: 'Custom Fields - List (Opportunity)',
        endpoint: `/v2/locations/${locationId}/customFields?model=opportunity`,
        method: 'GET' as const,
      },
      // Notes - Create (actual endpoint we use)
      {
        name: 'Notes - Create Endpoint (dry-run)',
        endpoint: `/contacts/test-contact-id/notes`,
        method: 'POST' as const,
        body: { body: 'Test note' }, // Dry-run test payload
      },
    ];

    // Run all tests in parallel
    const results = await Promise.all(
      endpointsToTest.map((test) =>
        testEndpoint(test.name, test.endpoint, test.method, testToken, (test as any).body)
      )
    );

    // Calculate summary
    const passed = results.filter((r) => r.success && r.status !== 404).length;
    const failed = results.filter((r) => !r.success).length;
    const warnings = results.filter((r) => r.status === 404).length;
    const total = results.length;

    const summary = {
      total,
      passed,
      failed,
      warnings,
    };

    console.log('🧪 Comprehensive GHL API Test Results:', {
      total,
      passed,
      failed,
      warnings,
      locationId,
    });

    return {
      success: failed === 0,
      locationId,
      token: `****${testToken.slice(-4)}`,
      results,
      summary,
    };
  } catch (error) {
    console.error('GHL comprehensive connection test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { 
      success: false, 
      error: `Comprehensive test failed: ${errorMessage}` 
    };
  }
}

/**
 * Test GHL API connection with a specific token (optional)
 * Always uses stored locationId for sub-account (location-level) API calls
 * @deprecated Use testGHLConnectionComprehensive instead for full endpoint testing
 */
export async function testGHLConnection(token?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const testToken = token || await getGHLToken();

    if (!testToken) {
      return { success: false, error: 'No token provided or found' };
    }

    // Validate token format (PIT tokens typically start with ghl_pit_ or pit-)
    if (testToken.trim().length < 20) {
      return { success: false, error: 'Token appears to be invalid (too short)' };
    }

    // Always use stored locationId for sub-account (location-level) API calls
    const locationId = await getGHLLocationId();
    
    if (!locationId) {
      return { success: false, error: 'Location ID is required. Please configure it in the admin settings.' };
    }

    // Test with contacts endpoint - works with contacts.write/readonly scope
    // Always use locationId for sub-account (location-level) API calls
    const testEndpoint = `${GHL_API_BASE}/contacts?locationId=${locationId}&limit=1`;

    const response = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken.trim()}`,
        'Content-Type': 'application/json',
        'Version': '2021-04-15',
      },
    });

    // Read response text once (can only read body once)
    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorDetails: any = {};
      if (responseText && responseText.trim().length > 0) {
        try {
          const errorData = JSON.parse(responseText);
          errorDetails = errorData;
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.msg) {
            errorMessage = errorData.msg;
          }
        } catch {
          // If JSON parsing fails, use raw text
          errorMessage = responseText.substring(0, 200) || response.statusText || `HTTP ${response.status}`;
        }
      } else {
        errorMessage = response.statusText || `HTTP ${response.status}: Empty response`;
      }

      // Provide helpful error messages based on status code
      if (response.status === 401) {
        const details = errorDetails.message || errorDetails.error || errorMessage;
        return { 
          success: false, 
          error: `Unauthorized - Invalid token or missing required scopes. GHL API says: ${details}. Make sure your PIT token has contacts.write or contacts.readonly scope.` 
        };
      } else if (response.status === 403) {
        const details = errorDetails.message || errorDetails.error || errorMessage;
        return { 
          success: false, 
          error: `Forbidden - ${details}. Ensure you have contacts.write scope enabled and the Location ID is correct.` 
        };
      } else {
        return { success: false, error: `Connection failed (${response.status}): ${errorMessage}` };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('GHL connection test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: `Connection test failed: ${errorMessage}` };
  }
}

/**
 * Fetch a contact from GHL by contact ID
 * Used to pre-fill form when opening survey continuation in new tab
 */
export async function getContactById(
  contactId: string,
  token?: string,
  locationId?: string
): Promise<GHLContactResponse> {
  try {
    // Use provided token or get from stored settings
    const finalToken = token || (await getGHLToken());
    
    // Use provided locationId, or get from stored settings
    const finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalToken) {
      throw new Error('GHL API token is required but not configured');
    }

    const url = `${GHL_API_BASE}/contacts/${contactId}`;
    
    const options: RequestInit = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28', // GHL 2.0 API version
      },
    };

    const response = await fetch(url, options);
    const responseText = await response.text();

    if (!response.ok) {
      let errorMessage = `GHL API Error (${response.status})`;
      if (responseText && responseText.trim().length > 0) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = `${errorMessage}: ${errorData.message || JSON.stringify(errorData)}`;
        } catch (parseError) {
          errorMessage = `${errorMessage}: ${responseText.substring(0, 200)}`;
        }
      }
      throw new Error(errorMessage);
    }

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from GHL API');
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse GHL API response:', parseError);
      throw new Error('Invalid response from GHL API - could not parse JSON');
    }

    // Handle different response structures
    const contact = data.contact || data;
    
    if (!contact || !contact.id) {
      console.error('GHL API response missing contact or contact.id:', data);
      throw new Error('Invalid response from GHL API - missing contact or contact.id');
    }

    return contact;
  } catch (error) {
    console.error('Failed to fetch contact by ID:', error);
    throw error;
  }
}
