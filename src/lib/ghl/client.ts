/**
 * GoHighLevel API Client
 * Handles all communication with GoHighLevel CRM API
 */

import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import type { GHLCredentials } from '@/lib/ghl/credentials';
import { normalizeFieldValue } from './field-normalizer';
import {
  GHLContact,
  GHLContactResponse,
  GHLOpportunity,
  GHLOpportunityResponse,
  GHLOpportunitySearchItem,
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
  GHLUserInfo,
} from './types';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

// Known object IDs from testing (these are the actual object IDs, not schema keys)
// These are the most reliable way to access custom objects
const KNOWN_OBJECT_IDS: Record<string, string> = {
  quotes: '6973793b9743a548458387d2', // Quote custom object ID
};

/**
 * Make authenticated request to GHL API
 * When credentials is provided (from OAuth session), uses token store.
 * Otherwise uses tokenOverride or getGHLToken() from config.
 */
export async function makeGHLRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, any>,
  locationId?: string,
  tokenOverride?: string,
  credentials?: GHLCredentials | null
): Promise<T> {
  try {
    let token: string | null = null;
    let resolvedLocationId = locationId;

    if (credentials?.token) {
      token = credentials.token;
      resolvedLocationId = credentials.locationId ?? locationId;
    } else if (tokenOverride) {
      token = tokenOverride;
    } else {
      token = await getGHLToken();
    }

    if (!token || typeof token !== 'string') {
      throw new Error('GHL API token not configured. Please set it in the admin settings.');
    }

    const url = `${GHL_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28', // GHL 2.0 API version
    };
    // When using OAuth credentials (location token), do NOT send Location-Id — GHL infers location from
    // the token. Sending it causes 403 "The token does not have access to this location". Only add the
    // header when using a non-credential token (e.g. agency/PIT) that may need it to scope the request.
    const sendLocationIdHeader = Boolean(resolvedLocationId && !credentials?.token);
    if (sendLocationIdHeader) {
      headers['Location-Id'] = resolvedLocationId!;
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

      // Log 403 with auth context so we can confirm Location-Id header is not sent when using location token
      if (response.status === 403) {
        console.warn('[CQ GHL] 403', {
          endpoint: endpoint.slice(0, 80),
          message: errorData?.message || errorData?.error || responseText?.slice(0, 100),
          usedCredentials: !!credentials?.token,
          sentLocationIdHeader: sendLocationIdHeader,
        });
      }
      // #region agent log
      if (response.status === 401) {
        fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'client.ts:makeGHLRequest',
            message: 'GHL 401',
            data: { endpoint: endpoint.slice(0, 60), errorPreview: (errorData?.message || errorData?.error || responseText?.slice(0, 80)) ?? null, usedCredentials: !!credentials, hypothesisId: 'H1-H5' },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      }
      // #endregion

      // Enhanced error logging for 400/404 errors to help debug (skip for expected "user id is invalid")
      const isInvalidUserId = response.status === 400 && (errorData?.message === 'The user id is invalid.' || String(errorData?.message || '').includes('user id is invalid'));
      if ((response.status === 400 || response.status === 404) && !isInvalidUserId) {
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
    const isInvalidUserId =
      error instanceof Error &&
      (error.message.includes('user id is invalid') || error.message.includes('The user id is invalid'));
    if (!isInvalidUserId) {
      console.error('GHL API request failed:', error);
    }
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
 * Update an existing contact in GHL by ID (PUT /contacts/:contactId).
 * Use when the contact was already created (e.g. after email step) and you are adding address/quote data.
 */
export async function updateContact(
  contactId: string,
  contactData: GHLContact,
  token?: string,
  locationId?: string,
  additionalTags?: string[]
): Promise<GHLContactResponse> {
  try {
    const finalToken = token || (await getGHLToken());
    const finalLocationId = locationId || (await getGHLLocationId());

    if (!finalToken) {
      throw new Error('GHL API token is required but not configured');
    }
    if (!contactId) {
      throw new Error('Contact ID is required to update contact');
    }

    const allTags = [
      ...(contactData.tags || []),
      ...(additionalTags || []),
    ];

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
      locationId: finalLocationId,
      ...(contactData.email && { email: contactData.email }),
      ...(contactData.phone && { phone: contactData.phone }),
      ...(contactData.address1 && { address1: contactData.address1 }),
      ...(contactData.city && { city: contactData.city }),
      ...(contactData.state && { state: contactData.state }),
      ...(contactData.postalCode && { postalCode: contactData.postalCode }),
      ...(contactData.country && {
        country: contactData.country.length === 2 ? contactData.country : contactData.country === 'USA' ? 'US' : contactData.country,
      }),
      ...(contactData.source && { source: contactData.source }),
      ...(allTags.length > 0 && { tags: allTags }),
      ...(customFieldsArray && customFieldsArray.length > 0 && { customFields: customFieldsArray }),
    };

    const url = `${GHL_API_BASE}/contacts/${contactId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${finalToken}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    if (!response.ok) {
      let errorMessage = `GHL API Error (${response.status})`;
      if (responseText && responseText.trim().length > 0) {
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = `${errorMessage}: ${errorData.message || errorData.error || JSON.stringify(errorData)}`;
        } catch {
          errorMessage = `${errorMessage}: ${responseText.substring(0, 200)}`;
        }
      }
      throw new Error(errorMessage);
    }

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('Empty response from GHL API');
    }

    const data = JSON.parse(responseText);
    const contact = data.contact || data;
    if (!contact || !contact.id) {
      throw new Error('Invalid response from GHL API - missing contact or contact.id');
    }
    return contact;
  } catch (error) {
    console.error('Failed to update contact:', error);
    throw error;
  }
}

/**
 * Create an opportunity in GHL
 * Always uses stored locationId for sub-account (location-level) API calls.
 * When tokenOverride is provided (e.g. tool-scoped token), use it so the opportunity
 * is created in the correct GHL location and uses that tool's pipeline/stage settings.
 */
export async function createOpportunity(
  opportunityData: GHLOpportunity,
  locationId?: string,
  tokenOverride?: string
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
      ...(opportunityData.assignedTo && { assignedTo: opportunityData.assignedTo }),
      ...(opportunityData.source && { source: opportunityData.source }),
      ...(opportunityData.tags && opportunityData.tags.length > 0 && { tags: opportunityData.tags }),
      ...(customFieldsArray && customFieldsArray.length > 0 && {
        customFields: customFieldsArray,
      }),
    };

    // GHL 2.0 API: Use opportunities endpoint - locationId is in the request body
    const response = await makeGHLRequest<{ opportunity: GHLOpportunityResponse }>(
      `/opportunities/`,
      'POST',
      payload,
      undefined,
      tokenOverride
    );

    return response.opportunity || response;
  } catch (error) {
    console.error('Failed to create opportunity:', error);
    throw error;
  }
}

/**
 * Add a note to a contact in GHL
 * Uses official endpoint: POST /contacts/:contactId/notes
 * https://marketplace.gohighlevel.com/docs/ghl/contacts/create-note
 *
 * The /v2/locations/.../contacts/.../notes path returns 404; the working path is
 * /contacts/:contactId/notes. locationId in body for sub-accounts; do NOT send
 * Location-Id header (can 403 with location-level PIT, same as associations).
 */
export async function createNote(
  noteData: GHLNote,
  locationId?: string,
  tokenOverride?: string
): Promise<GHLNoteResponse> {
  try {
    const finalLocationId = locationId || (await getGHLLocationId());

    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    // Official GHL: POST /contacts/:contactId/notes. Do NOT send locationId in body (422 "property locationId should not exist").
    const payload = { body: noteData.body };

    const endpoint = `/contacts/${noteData.contactId}/notes`;
    const response = await makeGHLRequest<{ note: GHLNoteResponse }>(
      endpoint,
      'POST',
      payload,
      undefined, // Do NOT pass Location-Id header (can 403 with location-level PIT)
      tokenOverride
    );

    return response.note || response;
  } catch (error) {
    console.error('Failed to create note:', error);
    throw error;
  }
}

/**
 * Create an appointment in GHL
 * Location-level PIT (Private Integration Token): token is scoped to one location;
 * do NOT send Location-Id header — GHL infers location from the token. Sending
 * Location-Id with a location-level PIT can cause 403 "token does not have access
 * to this location". For agency tokens, GHL may require Location-Id; we only
 * retry with it when the error clearly says location is required/not specified.
 */
export async function createAppointment(
  appointmentData: GHLAppointment,
  locationId?: string,
  tokenOverride?: string
): Promise<GHLAppointmentResponse> {
  try {
    const stored = locationId ?? (await getGHLLocationId());
    const finalLocationId = stored;
    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    const payload: Record<string, any> = {
      contactId: appointmentData.contactId,
      title: appointmentData.title,
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      locationId: finalLocationId, // GHL API requires locationId in body for /calendars/events/appointments
      ...(appointmentData.calendarId && { calendarId: appointmentData.calendarId }),
      ...(appointmentData.assignedTo && { assignedTo: appointmentData.assignedTo }),
      ...(appointmentData.notes && { notes: appointmentData.notes }),
    };

    const endpoint = `/calendars/events/appointments`;

    let response: { appointment?: GHLAppointmentResponse } | GHLAppointmentResponse;

    try {
      response = await makeGHLRequest<{ appointment: GHLAppointmentResponse }>(
        endpoint,
        'POST',
        payload,
        undefined,
        tokenOverride
      );
    } catch (first: any) {
      const msg = (first?.message || String(first)).toLowerCase();
      const tokenNoAccessToLocation = msg.includes('token does not have access') && msg.includes('location');
      const needLocation =
        !tokenNoAccessToLocation &&
        (msg.includes('locationid') && (msg.includes('not specified') || msg.includes('required'))) ||
        msg.includes('location is required') ||
        (msg.includes('location-id') && msg.includes('required'));
      if (needLocation) {
        try {
          response = await makeGHLRequest<{ appointment: GHLAppointmentResponse }>(
            endpoint,
            'POST',
            payload,
            finalLocationId,
            tokenOverride
          );
        } catch (retryErr) {
          console.error('Appointment create failed (with and without Location-Id):', retryErr instanceof Error ? retryErr.message : String(retryErr));
          throw retryErr;
        }
      } else {
        throw first;
      }
    }

    return (response as any)?.appointment || response;
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
        response = await makeGHLRequest<{ objects?: any[]; data?: any[]; schemas?: any[] }>(
          endpoint,
          'GET'
        );
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    if (!response) {
      return [];
    }

    const schemas = response.objects || response.data || response.schemas || (Array.isArray(response) ? response : []);
    return schemas;
  } catch {
    return [];
  }
}

/**
 * Get a specific object schema by key to see field definitions
 * Always uses stored locationId for sub-account (location-level) API calls
 */
export async function getObjectSchema(schemaKey: string, locationId?: string, tokenOverride?: string): Promise<any> {
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
        response = await makeGHLRequest<any>(endpoint, 'GET', undefined, undefined, tokenOverride);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
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
  locationId?: string,
  tokenOverride?: string
): Promise<GHLCustomObjectResponse> {
  try {
    // Always use locationId - required for sub-account (location-level) API calls
    let finalLocationId = locationId || (await getGHLLocationId());
    
    if (!finalLocationId) {
      throw new Error('Location ID is required. Please configure it in the admin settings.');
    }

    // Fetch schema directly. Skip GET /objects (list) — it 404s/401s for many GHL setups.
    // Use same token as contact/opportunity so tool-scoped GHL works.
    let actualSchemaKey: string | null = null;
    let schemaFields: any = null;
    const schemaKeyToFetch = (objectType === 'quotes' || objectType === 'Quote' || objectType === 'quote')
      ? 'custom_objects.quotes'
      : `custom_objects.${objectType}`;
    try {
      schemaFields = await getObjectSchema(schemaKeyToFetch, finalLocationId, tokenOverride);
      actualSchemaKey = schemaKeyToFetch;
    } catch (schemaErr) {
      console.warn('GHL Quote custom object: schema fetch failed (will try create with fallback keys):', schemaErr instanceof Error ? schemaErr.message : String(schemaErr));
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
        }
      });
      
      customFieldsArray = validFields.map(f => ({
        key: f.key,
        value: f.value,
        type: f.fieldType,
      }));
    }

    const propertiesFullPath: Record<string, any> = {};
    const propertiesShortName: Record<string, any> = {};
    
    // GHL Quote 'type' expects an array (e.g. ["move_out"]), not a string. Wrap string in array; keep array as-is.
    const asTypeValue = (v: any, key: string): any => {
      if (key !== 'type') return v;
      if (Array.isArray(v)) return v.length ? v.map((x) => (x != null ? String(x) : '')).filter(Boolean) : ['general_cleaning'];
      if (v != null && String(v).trim() !== '') return [String(v).trim()];
      return ['general_cleaning'];
    };

    if (validFields && validFields.length > 0) {
      validFields.forEach((field) => {
        const keyParts = field.key.split('.');
        const shortKey = keyParts.length > 0 ? keyParts[keyParts.length - 1] : field.key;
        const v = asTypeValue(field.value, shortKey);
        propertiesFullPath[field.key] = v;
        propertiesShortName[shortKey] = v;
      });
    } else if (data.customFields && Object.keys(data.customFields).length > 0) {
      // Fallback: GHL IRecordSchema "properties" is an object. When schema missing, use customFields as-is.
      Object.entries(data.customFields).forEach(([k, v]) => {
        let fv: any = v !== null && v !== undefined && Array.isArray(v) ? v : String(v ?? '');
        fv = asTypeValue(fv, k);
        propertiesShortName[k] = fv;
      });
    }

    // GHL API 2.0 (highlevel-api-docs): POST /objects/{schemaKey}/records
    // Body: { locationId, properties }. Sub-account PIT: locationId in body only, no Location-Id header.
    const payloadFullPath: Record<string, any> = {
      locationId: finalLocationId,
      properties: Object.keys(propertiesFullPath).length > 0 ? propertiesFullPath : {},
    };
    const payloadShortName: Record<string, any> = {
      locationId: finalLocationId,
      properties: propertiesShortName || {},
    };

    // GHL API 2.0 (highlevel-api-docs): POST /objects/{schemaKey}/records — schemaKey must include "custom_objects." prefix
    const schemaKeyForPath = (actualSchemaKey?.startsWith('custom_objects.') ? actualSchemaKey : (actualSchemaKey ? `custom_objects.${actualSchemaKey}` : null))
      || (objectType === 'quotes' || objectType === 'Quote' || objectType === 'quote' ? 'custom_objects.quotes' : `custom_objects.${objectType}`);
    const objectIdToUse = schemaFields?.object?.id || ((objectType === 'quotes' || objectType === 'Quote' || objectType === 'quote') ? KNOWN_OBJECT_IDS.quotes : null);
    
    let lastError: Error | null = null;
    let response: any = null;
    
    // 1) Try schemaKey path first (per GHL spec: /objects/{schemaKey}/records)
    const schemaKeyEndpoint = `/objects/${schemaKeyForPath}/records`;
    try {
      response = await makeGHLRequest<{ record?: { id: string } }>(schemaKeyEndpoint, 'POST', payloadShortName, undefined, tokenOverride);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (objectIdToUse) {
        const objectIdEndpoint = `/objects/${objectIdToUse}/records`;
        try {
          response = await makeGHLRequest<{ record?: { id: string } }>(objectIdEndpoint, 'POST', payloadShortName, undefined, tokenOverride);
        } catch (e2) {
          lastError = e2 instanceof Error ? e2 : new Error(String(e2));
          try {
            response = await makeGHLRequest<{ record?: { id: string } }>(objectIdEndpoint, 'POST', payloadFullPath, undefined, tokenOverride);
          } catch (e3) {
            lastError = e3 instanceof Error ? e3 : new Error(String(e3));
          }
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

    // GHL RecordByIdResponseDTO: { record: { id, properties, ... } } (highlevel-api-docs)
    const customObject = response.record || response[objectType] || response[objectType.slice(0, -1)] || response.Quote || (response?.id ? response : null);
    if (!customObject?.id) {
      console.error('Response structure:', Object.keys(response || {}), String(JSON.stringify(response)).slice(0, 400));
      throw new Error('Invalid response from GHL API - could not find custom object in response');
    }
    
    // GHL doesn't accept contactId in the creation payload; associate via POST /associations/relations
    // Always try to associate if contactId was provided
    if (data.contactId) {
      try {
        const objectIdForAssociation = objectIdToUse || schemaFields?.object?.id || KNOWN_OBJECT_IDS.quotes;
        // Get the schema key that was actually used (for association targetKey)
        const schemaKeyForAssociation = actualSchemaKey || 'custom_objects.quotes';
        
        if (objectIdForAssociation) {
          await associateCustomObjectWithContact(
            objectIdForAssociation,
            customObject.id,
            data.contactId,
            finalLocationId,
            schemaKeyForAssociation,
            tokenOverride
          );
          customObject.contactId = data.contactId;
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
 * Get association by key name (standard or user-defined).
 * GET /associations/key/:key_name?locationId=...
 * @see https://marketplace.gohighlevel.com/docs/ghl/associations/get-association-key-by-key-name
 */
export async function getAssociationByKeyName(
  keyName: string,
  locationId: string,
  credentials?: GHLCredentials | null,
  tokenOverride?: string
): Promise<{ id: string; [k: string]: unknown } | null> {
  const key = encodeURIComponent(keyName.trim());
  const res = await makeGHLRequest<{ id?: string; associationId?: string; [k: string]: unknown }>(
    `/associations/key/${key}?locationId=${encodeURIComponent(locationId)}`,
    'GET',
    undefined,
    locationId,
    tokenOverride,
    credentials
  );
  const id = res?.id ?? res?.associationId;
  if (id) return { id, ...res };
  return null;
}

/**
 * Get association(s) by object key (e.g. custom_objects.quotes, contact).
 * GET /associations/objectKey/:objectKey?locationId=...
 * @see https://marketplace.gohighlevel.com/docs/ghl/associations/get-association-by-object-keys
 */
export async function getAssociationByObjectKey(
  objectKey: string,
  locationId: string,
  credentials?: GHLCredentials | null,
  tokenOverride?: string
): Promise<Array<{ id: string; [k: string]: unknown }>> {
  const key = encodeURIComponent(objectKey.trim());
  const res = await makeGHLRequest<
    { id?: string; associationId?: string; [k: string]: unknown } | Array<{ id?: string; associationId?: string; [k: string]: unknown }>
  >(
    `/associations/objectKey/${key}?locationId=${encodeURIComponent(locationId)}`,
    'GET',
    undefined,
    locationId,
    tokenOverride,
    credentials
  );
  const list = Array.isArray(res) ? res : res?.id || res?.associationId ? [res] : [];
  return list
    .map((a) => ({ id: a.id ?? a.associationId ?? '', ...a }))
    .filter((a) => a.id);
}

/**
 * Get all relations for a record (e.g. a quote custom object record).
 * GET /associations/relations/{recordId}?locationId=...&skip=0&limit=100
 * Used to resolve contact association for quotes (contact ↔ custom_objects.quotes).
 * @see https://marketplace.gohighlevel.com/docs/ghl/associations/get-relations-by-record-id
 */
export async function getRelationsForRecord(
  recordId: string,
  locationId: string,
  credentials?: GHLCredentials | null
): Promise<Array<{ firstRecordId?: string; secondRecordId?: string; firstObjectKey?: string; secondObjectKey?: string }>> {
  const res = await makeGHLRequest<{ relations?: any[]; data?: any[] } | any[]>(
    `/associations/relations/${encodeURIComponent(recordId)}?locationId=${encodeURIComponent(locationId)}&skip=0&limit=100`,
    'GET',
    undefined,
    locationId,
    undefined,
    credentials
  );
  const list = Array.isArray(res) ? res : res?.relations ?? res?.data ?? [];
  return Array.isArray(list) ? list : [];
}

/**
 * Resolve contact id for a quote record via GHL associations (when not on the record).
 * Returns the first related contact id from getRelationsForRecord, or null.
 */
export async function getContactIdForQuoteRecord(
  quoteRecordId: string,
  locationId: string,
  credentials?: GHLCredentials | null
): Promise<string | null> {
  const relations = await getRelationsForRecord(quoteRecordId, locationId, credentials);
  for (const r of relations) {
    const first = r.firstRecordId ?? (r as any).firstRecordId;
    const second = r.secondRecordId ?? (r as any).secondRecordId;
    const firstKey = String((r.firstObjectKey ?? (r as any).firstObjectKey) ?? '').toLowerCase();
    const secondKey = String((r.secondObjectKey ?? (r as any).secondObjectKey) ?? '').toLowerCase();
    const isContact = (k: string) => k === 'contact' || k === 'contacts';
    if (first && second) {
      if (isContact(firstKey)) return first;
      if (isContact(secondKey)) return second;
      // No object keys: assume the other id is contact (quote-contact has two sides)
      if (first === quoteRecordId) return second;
      if (second === quoteRecordId) return first;
    }
  }
  return null;
}

/**
 * Associate a custom object with a contact (GHL highlevel-api-docs: associations.json)
 * - GET /associations/key/{key_name}?locationId= — get association by key name (preferred)
 * - POST /associations/relations — body createRelationReqDto: { locationId, associationId, firstRecordId, secondRecordId }
 * Scopes: associations.readonly (get), associations/relation.write (create)
 */
async function associateCustomObjectWithContact(
  objectId: string,
  recordId: string,
  contactId: string,
  locationId: string,
  schemaKey?: string, // Optional: the actual schema key used (e.g., 'custom_objects.quotes')
  tokenOverride?: string
): Promise<void> {
  if (!objectId) {
    throw new Error('Object ID is required for association');
  }

  // Step 1: Fetch association ID — try key name, then object key custom_objects.quotes, then legacy endpoints
  let associationId: string | null = null;
  try {
    const keyRes = await getAssociationByKeyName('contact_quote', locationId, undefined, tokenOverride);
    if (keyRes?.id) associationId = keyRes.id;
  } catch {
    // fall through
  }
  if (!associationId) {
    try {
      const byObjectKey = await getAssociationByObjectKey('custom_objects.quotes', locationId, undefined, tokenOverride);
      const contactQuote = byObjectKey.find((a: any) => {
        const first = (a.firstEntityKey ?? a.firstObjectKey ?? '').toLowerCase();
        const second = (a.secondEntityKey ?? a.secondObjectKey ?? '').toLowerCase();
        const isContact = (s: string) => s === 'contact' || s === 'contacts';
        const isQuote = (s: string) => s.includes('quote') || s === 'quotes' || s === 'custom_objects.quotes';
        return (isContact(first) && isQuote(second)) || (isQuote(first) && isContact(second));
      });
      if (contactQuote?.id) associationId = contactQuote.id;
    } catch {
      // fall through
    }
  }
  if (!associationId) {
    try {
      const associationEndpoints = [
        `/associations?locationId=${locationId}`,
        `/associations`,
        `/associations/object-keys?firstObjectKey=contact&secondObjectKey=custom_objects.quotes&locationId=${locationId}`,
        `/associations/object-keys?firstObjectKey=Contact&secondObjectKey=quotes&locationId=${locationId}`,
        `/associations/object-keys?firstObjectKey=Contact&secondObjectKey=Quote&locationId=${locationId}`,
        `/associations/object-keys?firstObjectKey=quotes&secondObjectKey=Contact&locationId=${locationId}`,
      ];

      for (const assocEndpoint of associationEndpoints) {
        try {
          const associationsResponse = await makeGHLRequest<any>(assocEndpoint, 'GET', undefined, undefined, tokenOverride);
        let associations: any[] = [];
        if (Array.isArray(associationsResponse)) {
          associations = associationsResponse;
        } else if (associationsResponse?.associations) {
          associations = Array.isArray(associationsResponse.associations) ? associationsResponse.associations : [];
        } else if (associationsResponse?.data) {
          associations = Array.isArray(associationsResponse.data) ? associationsResponse.data : [];
        } else if (associationsResponse?.id || associationsResponse?.associationId) {
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
          break;
        }
      } catch {
        continue;
      }
      }
    } catch {
      // Try without associationId
    }
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
        await makeGHLRequest<any>(endpoint, 'POST', { ...payload }, undefined, tokenOverride);
        return;
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
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

    // Our generated quote ids (QT-YYMMDD-XXXXX) are in the quote_id field, not the GHL record id.
    // /records/{id} expects the GHL record id, so /records/QT-* always 404. For quotes, try
    // getCustomObjectByQuoteId first to avoid hammering /records/ with wrong id.
    const isOurQuoteId = /^QT-\d{6}-[A-Z0-9]{5}$/i.test(objectId);
    if (isOurQuoteId && (objectType === 'quotes' || objectType === 'Quote' || objectType === 'quote')) {
      const byQuote = await getCustomObjectByQuoteId(objectId, finalLocationId);
      if (byQuote) return byQuote;
      throw new Error(`Quote with quote_id ${objectId} not found in GHL`);
    }

    // Determine the object ID to use for the endpoint
    // Based on testing, we know the object ID is the most reliable identifier
    let objectIdToUse: string | null = null;
    
    if (objectType === 'quotes' || objectType === 'Quote' || objectType === 'quote') {
      objectIdToUse = KNOWN_OBJECT_IDS.quotes;
    } else {
      try {
        const schemaKey = objectType.startsWith('custom_objects.') 
          ? objectType 
          : `custom_objects.${objectType}`;
        const schema = await getObjectSchema(schemaKey, finalLocationId);
        if (schema?.object?.id) {
          objectIdToUse = schema.object.id;
        }
      } catch {
        // Use fallback endpoints
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
        response = await makeGHLRequest<{ [key: string]: GHLCustomObjectResponse }>(endpoint, 'GET');
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
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
      return null;
    }

    const objectId = KNOWN_OBJECT_IDS.quotes;
    if (!objectId) {
      return null;
    }

    try {
      const endpoint = `/objects/${objectId}/records?locationId=${finalLocationId}`;
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
          return record as GHLCustomObjectResponse;
        }
      }
      return null;
    } catch {
      return null;
    }
  } catch (error) {
    console.error('Error searching for quote by quote_id:', error);
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
 * Get user by ID for a location (uses location token; do not send Location-Id header).
 * Pass locationId when available so GHL can scope the user to the location (avoids 400 "user id is invalid").
 */
export async function getGHLUser(
  userId: string,
  locationToken: string,
  locationId?: string
): Promise<GHLUserInfo | null> {
  if (!userId || !locationToken) return null;
  try {
    const endpoint = locationId
      ? `/users/${userId}?locationId=${encodeURIComponent(locationId)}`
      : `/users/${userId}`;
    const response = await makeGHLRequest<{ user?: Record<string, unknown> }>(
      endpoint,
      'GET',
      undefined,
      undefined,
      locationToken
    );
    const user = response?.user ?? (response as unknown as Record<string, unknown>);
    if (!user || typeof user !== 'object') return null;
    return {
      id: String(user.id ?? user._id ?? userId),
      name: [user.name, [user.firstName, user.lastName].filter(Boolean).join(' ')].find(Boolean) as string | undefined,
      email: user.email as string | undefined,
      firstName: user.firstName as string | undefined,
      lastName: user.lastName as string | undefined,
    };
  } catch (error) {
    const isInvalidUserId =
      error instanceof Error &&
      (error.message.includes('user id is invalid') || error.message.includes('The user id is invalid'));
    if (isInvalidUserId) {
      // Expected when userId is stale, from another location, or deleted; avoid log noise.
      return null;
    }
    console.warn('Failed to get GHL user:', error);
    return null;
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

    const response = await makeGHLRequest<any>(
      `/locations/${finalLocationId}/tags`,
      'POST',
      { name: tagName }
    );

    const tag = response.tag || response.data || response;
    
    if (!tag || !tag.id) {
      throw new Error('Invalid response from GHL API - no tag ID returned');
    }

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
        body: { body: 'Test note', locationId }, // Dry-run test payload
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
 * Options for testing GHL connection (e.g. when saving from dashboard with a specific tool/location).
 */
export type TestGHLConnectionOptions = {
  /** Tool ID so location is read from tool config (tool-scoped). */
  toolId?: string;
  /** Location ID to use for the test (overrides stored value when saving new settings). */
  locationId?: string;
};

/**
 * Test GHL API connection with a specific token (optional)
 * Always uses stored locationId for sub-account (location-level) API calls
 * @deprecated Use testGHLConnectionComprehensive instead for full endpoint testing
 */
export async function testGHLConnection(
  token?: string,
  options?: TestGHLConnectionOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    const testToken = token || await getGHLToken();

    if (!testToken) {
      return { success: false, error: 'No token provided or found' };
    }

    // Validate token format (PIT tokens typically start with ghl_pit_ or pit-)
    if (testToken.trim().length < 20) {
      return { success: false, error: 'Token appears to be invalid (too short)' };
    }

    // Use provided locationId, or fetch by toolId, or global
    let locationId: string | null = options?.locationId?.trim() ?? null;
    if (!locationId && options?.toolId) {
      locationId = await getGHLLocationId(options.toolId);
    }
    if (!locationId) {
      locationId = await getGHLLocationId();
    }
    if (!locationId) {
      return { success: false, error: 'Location ID is required. Please enter your HighLevel Location ID in the field above.' };
    }

    // Test with pipelines first (read-only). Fallback to contacts if token has only contacts scope.
    const encodedLocation = encodeURIComponent(locationId);
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${testToken.trim()}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    };
    let response = await fetch(
      `${GHL_API_BASE}/opportunities/pipelines?locationId=${encodedLocation}`,
      { method: 'GET', headers }
    );
    if (response.status === 403 || response.status === 401) {
      response = await fetch(
        `${GHL_API_BASE}/contacts?locationId=${encodedLocation}&limit=1`,
        { method: 'GET', headers }
      );
    }

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
 * Fetch a contact from GHL by contact ID.
 * When credentials (token + locationId) are provided, uses makeGHLRequest for marketplace/OAuth flow.
 */
export async function getContactById(
  contactId: string,
  token?: string,
  locationId?: string,
  credentials?: GHLCredentials | null
): Promise<GHLContactResponse> {
  const creds = credentials ?? (token && locationId ? { token, locationId } : null);
  if (creds?.token) {
    const data = await makeGHLRequest<{ contact?: GHLContactResponse } | GHLContactResponse>(
      `/contacts/${contactId}`,
      'GET',
      undefined,
      creds.locationId ?? undefined,
      undefined,
      creds
    );
    const contact = (data && typeof data === 'object' && 'contact' in data ? data.contact : data) as GHLContactResponse | undefined;
    if (!contact?.id) throw new Error('Invalid response from GHL API - missing contact or contact.id');
    return contact;
  }
  const finalToken = token || (await getGHLToken());
  const finalLocationId = locationId || (await getGHLLocationId());
  if (!finalToken) throw new Error('GHL API token is required but not configured');
  const data = await makeGHLRequest<{ contact?: GHLContactResponse } | GHLContactResponse>(
    `/contacts/${contactId}`,
    'GET',
    undefined,
    finalLocationId ?? undefined,
    finalToken,
    undefined
  );
  const contact = (data && typeof data === 'object' && 'contact' in data ? data.contact : data) as GHLContactResponse | undefined;
  if (!contact?.id) throw new Error('Invalid response from GHL API - missing contact or contact.id');
  return contact;
}

/**
 * Fetch all notes for a contact from GHL.
 * GET /contacts/:contactId/notes
 */
export async function listContactNotes(
  contactId: string,
  credentials?: GHLCredentials | null
): Promise<GHLNoteResponse[]> {
  const data = await makeGHLRequest<{ notes?: GHLNoteResponse[] } | GHLNoteResponse[]>(
    `/contacts/${contactId}/notes`,
    'GET',
    undefined,
    credentials?.locationId ?? undefined,
    undefined,
    credentials ?? undefined
  );
  const notes = Array.isArray(data) ? data : (data?.notes ?? []);
  return Array.isArray(notes) ? notes : [];
}

/**
 * List contacts from GHL for a location.
 * Uses GET /contacts with query params: locationId, limit, optional query (search).
 * API rejects skip; pagination uses limit only (first page). Version header required.
 * @see https://marketplace.gohighlevel.com/docs/api/contacts/get-contacts
 */
export async function listGHLContacts(
  locationId: string,
  options?: { limit?: number; page?: number; search?: string },
  credentials?: GHLCredentials | null
): Promise<{ contacts: any[]; total: number }> {
  const limit = Math.min(100, Math.max(1, options?.limit ?? 25));
  const params = new URLSearchParams({
    locationId,
    limit: String(limit),
  });
  if (options?.search?.trim()) {
    params.set('query', options.search.trim());
  }
  const res = await makeGHLRequest<{ contacts?: any[]; total?: number }>(
    `/contacts?${params.toString()}`,
    'GET',
    undefined,
    undefined,
    undefined,
    credentials
  );
  const contacts = res?.contacts ?? [];
  const total = res?.total ?? contacts.length;
  return { contacts, total };
}

/**
 * Get contacts by business ID.
 * GET /contacts/business/:businessId
 * @see https://marketplace.gohighlevel.com/docs/ghl/contacts/get-contacts-by-business-id
 */
export async function listGHLContactsByBusinessId(
  businessId: string,
  credentials?: GHLCredentials | null
): Promise<{ contacts: any[] }> {
  const res = await makeGHLRequest<{ contacts?: any[] }>(
    `/contacts/business/${encodeURIComponent(businessId)}`,
    'GET',
    undefined,
    undefined,
    undefined,
    credentials
  );
  const contacts = res?.contacts ?? [];
  return { contacts };
}

/**
 * List pipelines for a location (opportunity pipelines and stages).
 * GET /opportunities/pipelines?locationId=...
 * @see https://marketplace.gohighlevel.com/docs/ghl/opportunities/get-pipelines
 */
export async function listGHLPipelines(
  locationId: string,
  credentials?: GHLCredentials | null
): Promise<GHLPipeline[]> {
  const res = await makeGHLRequest<{ pipelines?: GHLPipeline[]; data?: GHLPipeline[] }>(
    `/opportunities/pipelines?locationId=${encodeURIComponent(locationId)}`,
    'GET',
    undefined,
    undefined,
    undefined,
    credentials
  );
  // #region agent log
  const resKeys = res && typeof res === 'object' ? Object.keys(res as object) : [];
  const fromPipelines = Array.isArray((res as any)?.pipelines) ? (res as any).pipelines.length : 0;
  const fromData = Array.isArray((res as any)?.data) ? (res as any).data.length : 0;
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'lib/ghl/client.ts:listGHLPipelines', message: 'GHL pipelines raw response', data: { responseKeys: resKeys, pipelinesLength: fromPipelines, dataLength: fromData }, timestamp: Date.now(), hypothesisId: 'H1-H5' }) }).catch(() => {});
  // #endregion
  const pipelines = res?.pipelines ?? res?.data ?? [];
  return Array.isArray(pipelines) ? pipelines : [];
}

/**
 * Search opportunities for a location, optionally filtered by pipeline.
 * GET /opportunities/search?locationId=...&pipeline_id=...&limit=...
 * @see https://marketplace.gohighlevel.com/docs/ghl/opportunities/search-opportunity
 */
export async function searchGHLOpportunities(
  locationId: string,
  options: { pipelineId?: string; limit?: number; status?: string } = {},
  credentials?: GHLCredentials | null
): Promise<{ opportunities: GHLOpportunitySearchItem[]; total?: number }> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const params = new URLSearchParams({
    location_id: locationId,
    limit: String(limit),
  });
  if (options.pipelineId) params.set('pipeline_id', options.pipelineId);
  if (options.status) params.set('status', options.status);
  const queryString = params.toString();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'client.ts:searchGHLOpportunities:before', message: 'GHL opportunities search params', data: { pipelineId: options.pipelineId ?? null, status: options.status ?? null, limit, queryKeys: Array.from(params.keys()) }, timestamp: Date.now(), hypothesisId: 'H1-H2' }) }).catch(() => {});
  // #endregion
  const res = await makeGHLRequest<{
    opportunities?: GHLOpportunitySearchItem[];
    data?: GHLOpportunitySearchItem[];
    meta?: { total?: number };
  }>(
    `/opportunities/search?${queryString}`,
    'GET',
    undefined,
    undefined,
    undefined,
    credentials
  );
  const resKeys = res && typeof res === 'object' && !Array.isArray(res) ? Object.keys(res as object) : [];
  const fromOpps = Array.isArray((res as any)?.opportunities) ? (res as any).opportunities.length : 0;
  const fromData = Array.isArray((res as any)?.data) ? (res as any).data.length : 0;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'client.ts:searchGHLOpportunities:after', message: 'GHL opportunities search response', data: { responseKeys: resKeys, opportunitiesLength: fromOpps, dataLength: fromData, metaTotal: (res as any)?.meta?.total }, timestamp: Date.now(), hypothesisId: 'H3-H5' }) }).catch(() => {});
  // #endregion
  const opportunities =
    res?.opportunities ?? res?.data ?? (Array.isArray(res) ? res : []);
  const list = Array.isArray(opportunities) ? opportunities : [];
  const total = (res as { meta?: { total?: number } })?.meta?.total;
  return { opportunities: list, total };
}

/**
 * Update an opportunity (e.g. move to another pipeline stage).
 * PUT /opportunities/:id
 * @see https://marketplace.gohighlevel.com/docs/ghl/opportunities/update-opportunity
 */
export async function updateGHLOpportunity(
  opportunityId: string,
  payload: { pipelineStageId?: string; name?: string; monetaryValue?: number; status?: string },
  locationId?: string,
  credentials?: GHLCredentials | null
): Promise<GHLOpportunityResponse> {
  const body: Record<string, unknown> = { ...payload };
  if (locationId) body.locationId = locationId;
  const res = await makeGHLRequest<{ opportunity?: GHLOpportunityResponse } | GHLOpportunityResponse>(
    `/opportunities/${encodeURIComponent(opportunityId)}`,
    'PUT',
    body as Record<string, any>,
    undefined,
    undefined,
    credentials
  );
  const opportunity = (res as { opportunity?: GHLOpportunityResponse })?.opportunity ?? res;
  return opportunity as GHLOpportunityResponse;
}

/**
 * List quote custom object records from GHL for a location.
 * Uses POST /objects/custom_objects.quotes/records/search with page + pageLimit (GHL does not support GET /objects/{id}/records for custom objects).
 */
export async function listGHLQuoteRecords(
  locationId: string,
  options?: { limit?: number },
  credentials?: GHLCredentials | null
): Promise<any[]> {
  const pageLimit = Math.min(500, Math.max(1, options?.limit ?? 2000));

  function parseRecords(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res?.records && Array.isArray(res.records)) return res.records;
    if (res?.data && Array.isArray(res.data)) return res.data;
    if (res?.customObjects && Array.isArray(res.customObjects)) return res.customObjects;
    if (typeof res === 'object') {
      for (const key of Object.keys(res)) {
        if (Array.isArray(res[key])) return res[key];
      }
    }
    return [];
  }

  const bodiesToTry = [
    { location_id: locationId, page: 1, pageLimit },
    { locationId, page: 1, pageLimit },
  ];
  let lastErr: unknown = null;
  for (const body of bodiesToTry) {
    try {
      const res = await makeGHLRequest<{ records?: any[]; data?: any[] }>(
        '/objects/custom_objects.quotes/records/search',
        'POST',
        body,
        undefined,
        undefined,
        credentials
      );
      const records = parseRecords(res);
      const out = Array.isArray(records) ? records : [];
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'client.ts:listGHLQuoteRecords', message: 'GHL quotes search ok', data: { recordCount: out.length, resKeys: res && typeof res === 'object' ? Object.keys(res) : [], firstRecordKeys: out[0] && typeof out[0] === 'object' ? Object.keys(out[0]) : [], hasContactIdOnFirst: !!(out[0] && (out[0].contactId ?? out[0].contact_id)) }, timestamp: Date.now(), hypothesisId: 'H3-H4' }) }).catch(() => {});
      // #endregion
      return out;
    } catch (err) {
      lastErr = err;
      continue;
    }
  }
  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'client.ts:listGHLQuoteRecords', message: 'GHL quotes search error', data: { error: msg.slice(0, 200), hypothesisId: 'H2' }, timestamp: Date.now(), hypothesisId: 'H2' }) }).catch(() => {});
  // #endregion
  console.warn('[CQ GHL] listGHLQuoteRecords failed:', msg);
  return [];
}
