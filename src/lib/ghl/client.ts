/**
 * GoHighLevel API Client
 * Handles all communication with GoHighLevel CRM API
 */

import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import { normalizeFieldValue } from './field-normalizer';
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

// Known object IDs from testing (these are the actual object IDs, not schema keys)
// These are the most reliable way to access custom objects
const KNOWN_OBJECT_IDS: Record<string, string> = {
  quotes: '6973793b9743a548458387d2', // Quote custom object ID
};

/**
 * Make authenticated request to GHL API
 */
export async function makeGHLRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, any>,
  locationId?: string // Optional: pass locationId to add as header if needed
): Promise<T> {
  try {
    const token = await getGHLToken();

    if (!token || typeof token !== 'string') {
      throw new Error('GHL API token not configured. Please set it in the admin settings.');
    }

    const url = `${GHL_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28', // GHL 2.0 API version
    };
    
    // Some endpoints may require locationId in header instead of query
    // For associations endpoint, always use header (query string causes 422 error)
    if (locationId) {
      // Always add Location-Id header if locationId is provided
      // Some endpoints (like associations) require it in header, not query string
      headers['Location-Id'] = locationId;
    }
    
    const options: RequestInit = {
      method,
      headers,
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
      customFieldsArray = Object.entries(contactData.customFields)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => ({
          key,
          value: normalizeFieldValue(value),
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
      ...(contactData.country && { 
        // GHL expects 2-letter country code (US, UK, CA, etc) not full name (USA, United States, etc)
        country: contactData.country.length === 2 ? contactData.country : contactData.country === 'USA' ? 'US' : contactData.country
      }),
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
      customFieldsArray = Object.entries(opportunityData.customFields)
        .filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([key, value]) => ({
          key,
          value: normalizeFieldValue(value),
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
 * Always uses stored locationId for sub-account (location-level) API calls
 */
export async function createNote(noteData: GHLNote, locationId?: string): Promise<GHLNoteResponse> {
  try {
    // Always use locationId - required for sub-account (location-level) API calls
    // Use provided locationId, or get from stored settings (required)
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    const payload = {
      body: noteData.body,
    };

    // GHL 2.0 API: Use contacts notes endpoint with locationId in path
    // Endpoint format: /v2/locations/{locationId}/contacts/{contactId}/notes
    const endpoint = `/v2/locations/${finalLocationId}/contacts/${noteData.contactId}/notes`;
    const response = await makeGHLRequest<{ note: GHLNoteResponse }>(
      endpoint,
      'POST',
      payload,
      finalLocationId // Pass locationId for header if needed
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
      // Note: locationId must NOT be in the body (GHL returns "locationId should not exist")
      ...(appointmentData.calendarId && { calendarId: appointmentData.calendarId }),
      ...(appointmentData.assignedTo && { assignedTo: appointmentData.assignedTo }),
      ...(appointmentData.notes && { notes: appointmentData.notes }),
    };

    console.log('Creating appointment with payload:', {
      ...payload,
      contactId: '***hidden***',
      locationIdHeader: finalLocationId,
    });

    // GHL 2.0 API: Use calendars/events/appointments endpoint for creating appointments
    // NOTE: locationId must NOT be in the body (causes "locationId should not exist" error).
    // The events API requires the Location-Id header for sub-accounts so GHL can scope
    // the request to the correct location (and its calendars). Without it, 401 Unauthorized
    // can occur. Use the location from Admin Settings (getGHLLocationId / ghl:location:id).
    const response = await makeGHLRequest<{ appointment: GHLAppointmentResponse }>(
      `/calendars/events/appointments`,
      'POST',
      payload,
      finalLocationId
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
          if (actualSchemaKey) {
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
    let validFields: Array<{ key: string; value: any; originalKey: string; fieldType?: string }> = [];
    
    if (data.customFields && Object.keys(data.customFields).length > 0) {
      // Build a map of our field names to schema field keys/IDs
      // The schema has full paths like "custom_objects.quotes.quote_id"
      const fieldMap = new Map<string, string>();
      const fieldNameMap = new Map<string, string>(); // Map by display name
      if (schemaFields?.fields && Array.isArray(schemaFields.fields)) {
        // Create a map: our field name -> schema field key/ID
        schemaFields.fields.forEach((field: any) => {
          const fieldKey = field.key || field.fieldKey || field.id;
          const fieldName = field.name || '';
          
          if (fieldKey) {
            // Map the full key (e.g., "custom_objects.quotes.quote_id")
            fieldMap.set(fieldKey.toLowerCase(), fieldKey);
            
            // Map by the last part of the key (e.g., "quote_id" -> "custom_objects.quotes.quote_id")
            const keyParts = fieldKey.split('.');
            if (keyParts.length > 0) {
              const shortKey = keyParts[keyParts.length - 1];
              fieldMap.set(shortKey.toLowerCase(), fieldKey);
            }
            
            // Map by display name (e.g., "Quote ID" -> "custom_objects.quotes.quote_id")
            if (fieldName) {
              const normalizedName = fieldName.toLowerCase().replace(/\s+/g, '_');
              fieldMap.set(normalizedName, fieldKey);
              fieldNameMap.set(normalizedName, fieldKey);
            }
          }
        });
      }
      
      // Filter and map fields - only include fields that exist in the schema
      // Also format values based on field type (arrays for MULTIPLE_OPTIONS, etc.)
      validFields = [];
      
      Object.entries(data.customFields).forEach(([ourKey, value]) => {
        let fieldKey: string | null = null;
        let fieldType: string | undefined;
        let fieldDefinition: any = null;
        
        // If our key already has the full path, check if it exists in schema
        if (ourKey.startsWith('custom_objects.')) {
          const normalizedFullKey = ourKey.toLowerCase();
          if (fieldMap.has(normalizedFullKey)) {
            fieldKey = fieldMap.get(normalizedFullKey)!;
            // Find the field definition to get its type
            if (schemaFields?.fields) {
              fieldDefinition = schemaFields.fields.find((f: any) => 
                (f.key || f.fieldKey || '').toLowerCase() === normalizedFullKey
              );
            }
          }
        } else {
          // Try to find the full schema key for our short field name
          const normalizedKey = ourKey.toLowerCase();
          
          // Try direct match first
          let schemaFieldKey = fieldMap.get(normalizedKey);
          
          // If not found, try with underscores/hyphens normalized
          if (!schemaFieldKey) {
            schemaFieldKey = fieldMap.get(normalizedKey.replace(/-/g, '_'));
          }
          
          // If still not found, try matching by field name
          if (!schemaFieldKey && schemaFields?.fields) {
            const matchingField = schemaFields.fields.find((f: any) => {
              const fieldName = (f.name || '').toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
              const ourKeyNormalized = ourKey.toLowerCase().replace(/-/g, '_');
              return fieldName === ourKeyNormalized || 
                     fieldName.includes(ourKeyNormalized) ||
                     ourKeyNormalized.includes(fieldName);
            });
            if (matchingField) {
              schemaFieldKey = matchingField.key || matchingField.fieldKey;
              fieldDefinition = matchingField;
            }
          } else if (schemaFieldKey && schemaFields?.fields) {
            // Find the field definition
            fieldDefinition = schemaFields.fields.find((f: any) => 
              (f.key || f.fieldKey || '').toLowerCase() === schemaFieldKey?.toLowerCase()
            );
          }
          
          if (schemaFieldKey) {
            fieldKey = schemaFieldKey;
          }
        }
        
        // Get field type from definition
        if (fieldDefinition) {
          fieldType = fieldDefinition.type || fieldDefinition.dataType;
        }
        
        // Only include if we found a valid field key in the schema
        if (fieldKey) {
          // Format value based on field type
          let formattedValue: any = value;
          
          if (fieldType === 'MULTIPLE_OPTIONS') {
            // MULTIPLE_OPTIONS expects an array
            if (Array.isArray(value)) {
              formattedValue = value;
            } else if (typeof value === 'string' && value.includes(',')) {
              // Comma-separated string -> array
              formattedValue = value.split(',').map(v => v.trim());
            } else {
              // Single value -> array with one item
              formattedValue = [String(value)];
            }
          } else if (fieldType === 'SINGLE_OPTIONS') {
            // SINGLE_OPTIONS can be string or array (GHL accepts both)
            formattedValue = String(value);
          } else if (fieldType === 'NUMERICAL') {
            // NUMERICAL should be a number
            formattedValue = typeof value === 'number' ? value : Number(value) || 0;
          } else {
            // TEXT and other types - keep as string
            formattedValue = String(value);
          }
          
          validFields.push({
            key: fieldKey,
            value: formattedValue,
            originalKey: ourKey,
            fieldType,
          });
        } else {
          console.warn(`⚠️ Field "${ourKey}" not found in schema, skipping`);
        }
      });
      
      // For properties format, we don't need the array - we'll use the object directly
      // But keep the array for logging
      customFieldsArray = validFields.map(f => ({
        key: f.key,
        value: f.value,
        type: f.fieldType,
      }));
      
      const originalFieldsCount = Object.keys(data.customFields || {}).length;
      console.log('📋 Custom fields mapping:', {
        totalFields: customFieldsArray.length,
        originalFieldsCount,
        skippedFields: originalFieldsCount - customFieldsArray.length,
        fieldKeys: customFieldsArray.map(f => f.key),
        sampleMapping: validFields.slice(0, 3).map(f => `${f.originalKey} -> ${f.key}`),
      });
    }

    // GHL API payload format for creating records
    // According to docs: POST /objects/{schemaKey}/records
    // The API expects "properties" as an object with field keys as properties
    // Based on testing, when using object ID, it needs short field names (e.g., "quote_id")
    // When using schema key, it may need full paths (e.g., "custom_objects.quotes.quote_id")
    // We'll try both formats
    const propertiesFullPath: Record<string, any> = {};
    const propertiesShortName: Record<string, any> = {};
    
    if (validFields && validFields.length > 0) {
      validFields.forEach((field) => {
        // Full path format (e.g., "custom_objects.quotes.quote_id")
        propertiesFullPath[field.key] = field.value;
        
        // Short name format (e.g., "quote_id") - extract last part of key
        const keyParts = field.key.split('.');
        const shortKey = keyParts.length > 0 ? keyParts[keyParts.length - 1] : field.key;
        propertiesShortName[shortKey] = field.value;
      });
    }
    
    // Build payloads with both field formats
    // Some endpoints may need full paths, others may need short names
    // Note: contactId cannot be included in the creation payload (GHL returns 422 error)
    // We'll associate the contact after creation using the associations API
    const payloadFullPath: Record<string, any> = {
      locationId: finalLocationId,
      ...(Object.keys(propertiesFullPath).length > 0 && {
        properties: propertiesFullPath,
      }),
    };
    
    const payloadShortName: Record<string, any> = {
      locationId: finalLocationId,
      ...(Object.keys(propertiesShortName).length > 0 && {
        properties: propertiesShortName,
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

    // GHL 2.0 API: POST /objects/{objectId}/records
    // Based on testing, we know:
    // - Object ID endpoint works: /objects/6973793b9743a548458387d2/records
    // - Short field names work: quote_id (not custom_objects.quotes.quote_id)
    // - Object ID is the most reliable identifier
    
    // Determine the object ID to use
    let objectIdToUse: string | null = null;
    
    // Priority 1: Use object ID from schema if available
    if (schemaFields?.object?.id) {
      objectIdToUse = schemaFields.object.id;
      console.log(`✅ Using object ID from schema: ${objectIdToUse}`);
    }
    // Priority 2: Use known object ID for quotes
    else if ((objectType === 'quotes' || objectType === 'Quote' || objectType === 'quote') && KNOWN_OBJECT_IDS.quotes) {
      objectIdToUse = KNOWN_OBJECT_IDS.quotes;
      console.log(`✅ Using known object ID for quotes: ${objectIdToUse}`);
    }
    // Priority 3: Try to get object ID from schema fetch
    else {
      try {
        const schemaKey = objectType === 'quotes' || objectType === 'Quote' 
          ? 'custom_objects.quotes' 
          : objectType.startsWith('custom_objects.') 
            ? objectType 
            : `custom_objects.${objectType}`;
        const tempSchema = await getObjectSchema(schemaKey, finalLocationId);
        if (tempSchema?.object?.id) {
          objectIdToUse = tempSchema.object.id;
          console.log(`✅ Found object ID from schema fetch: ${objectIdToUse}`);
        }
      } catch (error) {
        console.log('⚠️ Could not fetch schema to get object ID');
      }
    }
    
    let lastError: Error | null = null;
    let response: any = null;
    
    // Try with object ID first (most reliable - we know this works)
    if (objectIdToUse) {
      const endpoint = `/objects/${objectIdToUse}/records`;
      try {
        console.log(`Attempting to create custom object at endpoint: ${endpoint} (using object ID with short field names)`);
        console.log(`Payload:`, JSON.stringify(payloadShortName, null, 2));
        response = await makeGHLRequest<{ [key: string]: GHLCustomObjectResponse }>(
          endpoint,
          'POST',
          payloadShortName
        );
        console.log(`✅ Successfully created custom object at: ${endpoint} using object ID with short field names`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`❌ Failed at ${endpoint}:`, lastError.message);
        // Try with full paths as fallback
        try {
          console.log(`Trying with full field paths as fallback...`);
          response = await makeGHLRequest<{ [key: string]: GHLCustomObjectResponse }>(
            endpoint,
            'POST',
            payloadFullPath
          );
          console.log(`✅ Successfully created custom object at: ${endpoint} using full field paths`);
        } catch (fallbackError) {
          lastError = fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError));
          console.log(`❌ Also failed with full paths:`, lastError.message);
        }
      }
    }
    
    // Fallback: Try with schema key names if object ID didn't work
    if (!response && actualSchemaKey) {
      const endpointsToTry: string[] = [];
      const cleanObjectType = objectType.startsWith('custom_objects.') 
        ? objectType.split('.').pop() || objectType
        : objectType;
      
      if (actualSchemaKey.startsWith('custom_objects.')) {
        const keyPart = actualSchemaKey.split('.').pop();
        if (keyPart) endpointsToTry.push(keyPart);
      }
      endpointsToTry.push(cleanObjectType, 'quotes', 'Quote');
      
      const uniqueEndpoints = Array.from(new Set(endpointsToTry));
      for (const schemaKey of uniqueEndpoints) {
        if (!schemaKey) continue;
        const endpoint = `/objects/${schemaKey}/records`;
        try {
          console.log(`Trying fallback endpoint: ${endpoint}`);
          response = await makeGHLRequest<{ [key: string]: GHLCustomObjectResponse }>(
            endpoint,
            'POST',
            payloadShortName
          );
          console.log(`✅ Successfully created custom object at fallback endpoint: ${endpoint}`);
          break;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.log(`❌ Failed at fallback ${endpoint}:`, lastError.message);
        }
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
        const triedEndpoints = objectIdToUse 
          ? `Object ID: ${objectIdToUse}` 
          : actualSchemaKey 
            ? `Schema key: ${actualSchemaKey}` 
            : `Object type: ${objectType}`;
        errorMsg = `Failed to create custom object - "Invalid Key Passed" error. This usually means:\n` +
          `1. The Quote custom object schema doesn't exist in your GHL account (create it in Settings > Custom Objects)\n` +
          `2. The endpoint format is incorrect. Tried: ${triedEndpoints}\n` +
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
    
    if (!customObject || !customObject.id) {
      console.error('Response structure:', Object.keys(response));
      throw new Error('Invalid response from GHL API - could not find custom object in response');
    }
    
    // GHL doesn't accept contactId in the creation payload, so we must associate it after creation
    // Always try to associate if contactId was provided
    if (data.contactId) {
      try {
        const objectIdForAssociation = objectIdToUse || schemaFields?.object?.id || KNOWN_OBJECT_IDS.quotes;
        // Get the schema key that was actually used (for association targetKey)
        const schemaKeyForAssociation = actualSchemaKey || 'custom_objects.quotes';
        
        if (objectIdForAssociation) {
          console.log(`🔗 Associating custom object ${customObject.id} with contact ${data.contactId}...`, {
            objectId: objectIdForAssociation,
            schemaKey: schemaKeyForAssociation,
            recordId: customObject.id,
            contactId: data.contactId,
          });
          
          await associateCustomObjectWithContact(
            objectIdForAssociation,
            customObject.id,
            data.contactId,
            finalLocationId,
            schemaKeyForAssociation // Pass the actual schema key used
          );
          
          console.log(`✅ Successfully associated custom object ${customObject.id} with contact ${data.contactId}`);
          customObject.contactId = data.contactId;
        } else {
          console.warn(`⚠️ Cannot associate custom object - object ID not available`);
        }
      } catch (assocError) {
        // Log as error (not just warning) so it's more visible
        console.error(`❌ Failed to associate custom object with contact:`, {
          error: assocError instanceof Error ? assocError.message : String(assocError),
          stack: assocError instanceof Error ? assocError.stack : undefined,
          recordId: customObject.id,
          contactId: data.contactId,
          note: 'The quote was created but is not associated with the contact. Check GHL API logs for details.',
        });
        // Don't throw - the object was created successfully, association is optional
        // But log as error so it's visible in production logs
      }
    }
    
    return customObject as GHLCustomObjectResponse;
  } catch (error) {
    console.error(`Failed to create custom object (${objectType}):`, error);
    throw error;
  }
}

/**
 * Associate a custom object with a contact using GHL Associations API
 * GHL doesn't accept contactId in the creation payload, so association must be done separately
 * 
 * GHL API format requires:
 * - associationId: The association definition ID (must fetch first)
 * - firstRecordId: One record ID (contact or quote)
 * - secondRecordId: The other record ID
 * - locationId: In query string only, NOT in body
 */
async function associateCustomObjectWithContact(
  objectId: string,
  recordId: string,
  contactId: string,
  locationId: string,
  schemaKey?: string // Optional: the actual schema key used (e.g., 'custom_objects.quotes')
): Promise<void> {
  if (!objectId) {
    throw new Error('Object ID is required for association');
  }
  
  // Step 1: Fetch association definitions to find the Contact-Quote association ID
  let associationId: string | null = null;
  
  try {
    // Try multiple endpoints to find the association
    const associationEndpoints = [
      `/associations/key/contact_quote?locationId=${locationId}`,
      `/associations?locationId=${locationId}`,
      `/associations`,
      `/associations/object-keys?firstObjectKey=contact&secondObjectKey=custom_objects.quotes&locationId=${locationId}`,
      `/associations/object-keys?firstObjectKey=Contact&secondObjectKey=quotes&locationId=${locationId}`,
      `/associations/object-keys?firstObjectKey=Contact&secondObjectKey=Quote&locationId=${locationId}`,
      `/associations/object-keys?firstObjectKey=quotes&secondObjectKey=Contact&locationId=${locationId}`,
    ];
    
    for (const assocEndpoint of associationEndpoints) {
      try {
        console.log(`🔍 Fetching association from ${assocEndpoint}...`);
        const associationsResponse = await makeGHLRequest<any>(
          assocEndpoint,
          'GET'
        );
        
        // GHL returns associations in various formats
        let associations: any[] = [];
        if (Array.isArray(associationsResponse)) {
          associations = associationsResponse;
        } else if (associationsResponse.associations) {
          associations = Array.isArray(associationsResponse.associations) ? associationsResponse.associations : [];
        } else if (associationsResponse.data) {
          associations = Array.isArray(associationsResponse.data) ? associationsResponse.data : [];
        } else if (associationsResponse.id || associationsResponse.associationId) {
          // Single association object
          associations = [associationsResponse];
        }
        
        // Look for association between Contact and Quote/quotes
        const contactQuoteAssociation = associations.find((assoc: any) => {
          const firstEntity = (assoc.firstEntityKey || assoc.firstEntity || assoc.sourceKey || assoc.firstObjectKey || '').toLowerCase();
          const secondEntity = (assoc.secondEntityKey || assoc.secondEntity || assoc.targetKey || assoc.secondObjectKey || '').toLowerCase();
          
          const isContactFirst = firstEntity === 'contact' || firstEntity === 'contacts';
          const isContactSecond = secondEntity === 'contact' || secondEntity === 'contacts';
          const isQuoteFirst = firstEntity.includes('quote') || firstEntity === 'quotes';
          const isQuoteSecond = secondEntity.includes('quote') || secondEntity === 'quotes';
          
          return (isContactFirst && isQuoteSecond) || (isQuoteFirst && isContactSecond);
        });
        
        if (contactQuoteAssociation) {
          associationId = contactQuoteAssociation.id || contactQuoteAssociation.associationId || contactQuoteAssociation._id;
          console.log(`✅ Found association definition: ${associationId}`, {
            firstEntity: contactQuoteAssociation.firstEntityKey || contactQuoteAssociation.firstEntity || contactQuoteAssociation.firstObjectKey,
            secondEntity: contactQuoteAssociation.secondEntityKey || contactQuoteAssociation.secondEntity || contactQuoteAssociation.secondObjectKey,
            fullAssociation: contactQuoteAssociation,
          });
          break; // Found it, stop searching
        }
      } catch (endpointError) {
        // Try next endpoint
        continue;
      }
    }
    
    if (!associationId) {
      console.warn(`⚠️ No Contact-Quote association definition found. You may need to create it in GHL first.`);
    }
  } catch (error) {
    console.warn(`⚠️ Could not fetch association definitions (will try without associationId):`, error instanceof Error ? error.message : String(error));
  }
  
  // Step 2: Create the relation using the correct format
  // Endpoint: POST /associations/relations
  // Payload: { associationId, firstRecordId, secondRecordId, locationId }
  // GHL requires locationId in the body ("LocationId is not specified" otherwise) and associationId when creating a relation.
  const endpointsToTry = [
    `/associations/relations`,
  ];
  
  // Try with and without associationId (some setups might auto-detect). Always include locationId in body.
  const payloadsToTry = associationId 
    ? [{ associationId, firstRecordId: contactId, secondRecordId: recordId, locationId }]
    : [
        { firstRecordId: contactId, secondRecordId: recordId, locationId },
        { firstRecordId: recordId, secondRecordId: contactId, locationId },
      ];
  
  const errors: string[] = [];
  for (const endpoint of endpointsToTry) {
    for (const payload of payloadsToTry) {
      try {
        const cleanPayload = { ...payload };
        
        console.log(`🔗 Attempting to associate custom object with contact:`, {
          endpoint,
          payload: cleanPayload,
          contactId,
          recordId,
        });
        
        const response = await makeGHLRequest<any>(
          endpoint,
          'POST',
          cleanPayload
          // locationId is in body; do not pass as header for this endpoint
        );
        
        console.log(`✅ Successfully associated custom object ${recordId} with contact ${contactId}`, {
          endpoint,
          payload: cleanPayload,
          response: response,
        });
        return; // Success
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(errorMsg);
        console.log(`❌ Failed association attempt:`, {
          endpoint,
          payload,
          error: errorMsg,
        });
        // Try next variation
      }
    }
  }
  
  // If all attempts failed
  const errorMessage = `Failed to associate custom object with contact. Tried ${errors.length} variation(s). Last error: ${errors[errors.length - 1] || 'Unknown error'}`;
  console.error('❌ Association failed:', errorMessage);
  throw new Error(errorMessage);
}

/**
 * Get a custom object by ID from GHL
 * Always uses stored locationId for sub-account (location-level) API calls
 * Based on testing, we need to use the object ID (not schema key) for the endpoint
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

    // Determine the object ID to use for the endpoint
    // Based on testing, we know the object ID is the most reliable identifier
    let objectIdToUse: string | null = null;
    
    // Priority 1: Use known object ID for quotes (fastest, most reliable)
    if (objectType === 'quotes' || objectType === 'Quote' || objectType === 'quote') {
      objectIdToUse = KNOWN_OBJECT_IDS.quotes;
      console.log(`✅ Using known object ID for quotes: ${objectIdToUse}`);
    }
    // Priority 2: Try to fetch schema to get object ID
    else {
      try {
        const schemaKey = objectType.startsWith('custom_objects.') 
          ? objectType 
          : `custom_objects.${objectType}`;
        const schema = await getObjectSchema(schemaKey, finalLocationId);
        if (schema?.object?.id) {
          objectIdToUse = schema.object.id;
          console.log(`✅ Found object ID from schema: ${objectIdToUse}`);
        }
      } catch (schemaError) {
        console.log('⚠️ Could not fetch schema to get object ID, will try fallback endpoints');
      }
    }

    // For GET requests, locationId should be in query string, not body
    // Based on testing, we should use the object ID in the endpoint (most reliable)
    const endpointsToTry: string[] = [];
    
    // Priority 1: Use object ID endpoint (we know this works)
    if (objectIdToUse) {
      endpointsToTry.push(
        `/objects/${objectIdToUse}/records/${objectId}?locationId=${finalLocationId}`,
        `/objects/${objectIdToUse}/${objectId}?locationId=${finalLocationId}`,
      );
    }
    
    // Priority 2: Try with objectType as fallback
    endpointsToTry.push(
      `/objects/${objectType}/records/${objectId}?locationId=${finalLocationId}`,
      `/objects/${objectType}/${objectId}?locationId=${finalLocationId}`,
    );
    
    // Priority 3: If objectType is lowercase plural, also try capitalized singular
    if (objectType === 'quotes') {
      endpointsToTry.push(
        `/objects/Quote/records/${objectId}?locationId=${finalLocationId}`,
        `/objects/Quote/${objectId}?locationId=${finalLocationId}`,
      );
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
    // Try to find the object in the response
    const customObject = response.record || response[objectType] || response[objectType.slice(0, -1)] || response.Quote || response;
    
    if (!customObject || !customObject.id) {
      console.error('Response structure:', Object.keys(response));
      throw new Error('Invalid response from GHL API - could not find custom object in response');
    }
    
    return customObject as GHLCustomObjectResponse;
  } catch (error) {
    console.error(`Failed to get custom object (${objectType}/${objectId}):`, error);
    throw error;
  }
}

/**
 * Search for a quote custom object by quote_id field (generated UUID)
 * This is useful when we have the generated UUID but need to find the GHL object
 */
export async function getCustomObjectByQuoteId(
  quoteId: string,
  locationId?: string
): Promise<GHLCustomObjectResponse | null> {
  try {
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      console.log('⚠️ Location ID not available, cannot search by quote_id');
      return null;
    }

    const objectId = KNOWN_OBJECT_IDS.quotes;
    if (!objectId) {
      console.log('⚠️ Known quotes object ID not available, cannot search by quote_id');
      return null;
    }

    // Try to list records and search for the one with matching quote_id
    // Note: GHL API might not support filtering, so we may need to list all and filter client-side
    // This is a fallback method - prefer using getCustomObjectById with GHL object ID when possible
    try {
      const endpoint = `/objects/${objectId}/records?locationId=${finalLocationId}`;
      console.log(`🔍 Attempting to search for quote by quote_id: ${quoteId}`);
      
      const response = await makeGHLRequest<any>(endpoint, 'GET');
      
      // GHL returns records in various formats
      let records: any[] = [];
      if (Array.isArray(response)) {
        records = response;
      } else if (response.records && Array.isArray(response.records)) {
        records = response.records;
      } else if (response.data && Array.isArray(response.data)) {
        records = response.data;
      } else if (typeof response === 'object') {
        // Try to find records in the response object
        const keys = Object.keys(response);
        for (const key of keys) {
          if (Array.isArray(response[key])) {
            records = response[key];
            break;
          }
        }
      }
      
      // Search for the record with matching quote_id
      for (const record of records) {
        const recordQuoteId = record.properties?.quote_id || record.customFields?.quote_id || record.quote_id;
        if (recordQuoteId === quoteId) {
          console.log(`✅ Found quote by quote_id field: ${quoteId}`);
          return record as GHLCustomObjectResponse;
        }
      }
      
      console.log(`⚠️ Quote with quote_id ${quoteId} not found in GHL records`);
      return null;
    } catch (error) {
      console.log(`⚠️ Failed to search for quote by quote_id:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  } catch (error) {
    console.error('Error searching for quote by quote_id:', error);
    return null;
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
        endpoint: `/v2/locations/${locationId}/contacts/test-contact-id/notes`,
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
