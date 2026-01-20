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
} from './types';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/**
 * Make authenticated request to GHL API
 */
async function makeGHLRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, any>
): Promise<T> {
  try {
    const token = await getGHLToken();

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

    if (!response.ok) {
      const errorData = (await response.json()) as GHLAPIError;
      throw new Error(
        `GHL API Error (${response.status}): ${errorData.message || JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('GHL API request failed:', error);
    throw error;
  }
}

/**
 * Create or update a contact in GHL
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

    const payload: Record<string, any> = {
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      ...(contactData.email && { email: contactData.email }),
      ...(contactData.phone && { phone: contactData.phone }),
      ...(contactData.source && { source: contactData.source }),
      ...(contactData.address1 && { address1: contactData.address1 }),
      ...(allTags.length > 0 && { tags: allTags }),
      ...(contactData.customFields && Object.keys(contactData.customFields).length > 0 && {
        customFields: contactData.customFields,
      }),
    };

    // Use provided token or the API client token
    // GHL 2.0 API: Use location-level upsert endpoint with phone or email matching
    const url = `${GHL_API_BASE}/v2/locations/${finalLocationId}/contacts/upsert`;
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

    if (!response.ok) {
      const errorData = (await response.json()) as any;
      throw new Error(
        `GHL API Error (${response.status}): ${errorData.message || JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return data.contact || data;
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

    const payload: Record<string, any> = {
      contactId: opportunityData.contactId,
      name: opportunityData.name,
      ...(opportunityData.value && { monetaryValue: opportunityData.value }),
      ...(opportunityData.pipelineId && { pipelineId: opportunityData.pipelineId }),
      ...(opportunityData.pipelineStageId && {
        pipelineStageId: opportunityData.pipelineStageId,
      }),
      ...(opportunityData.status && { status: opportunityData.status }),
      ...(opportunityData.customFields && Object.keys(opportunityData.customFields).length > 0 && {
        customFields: opportunityData.customFields,
      }),
    };

    // GHL 2.0 API: Use location-level opportunities endpoint
    const response = await makeGHLRequest<{ opportunity: GHLOpportunityResponse }>(
      `/v2/locations/${finalLocationId}/opportunities`,
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

    // GHL 2.0 API: Use location-level notes endpoint
    const response = await makeGHLRequest<{ note: GHLNoteResponse }>(
      `/v2/locations/${finalLocationId}/contacts/${noteData.contactId}/notes`,
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
      ...(appointmentData.notes && { notes: appointmentData.notes }),
      ...(appointmentData.calendarId && { calendarId: appointmentData.calendarId }),
    };

    console.log('Creating appointment with payload:', {
      ...payload,
      contactId: '***hidden***',
    });

    // GHL 2.0 API: Use location-level appointments endpoint
    const response = await makeGHLRequest<{ appointment: GHLAppointmentResponse }>(
      `/v2/locations/${finalLocationId}/calendars/appointments`,
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

    const data = await response.json();
    const locations = data.locations || data.data || [];
    
    if (locations.length > 0) {
      return locations[0].id;
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
      `/v2/locations/${finalLocationId}/tags`,
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
  token: string
): Promise<{ name: string; success: boolean; status?: number; message: string; endpoint: string }> {
  try {
    const response = await fetch(`${GHL_API_BASE}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
    });

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

    // Define all endpoints to test - focus on GET endpoints that return real data or proper errors
    const endpointsToTest = [
      // Contacts
      {
        name: 'Contacts - List & Read',
        endpoint: `/v2/locations/${locationId}/contacts?limit=1`,
        method: 'GET' as const,
      },
      // Opportunities
      {
        name: 'Opportunities - List & Read',
        endpoint: `/v2/locations/${locationId}/opportunities?limit=1`,
        method: 'GET' as const,
      },
      // Pipelines
      {
        name: 'Pipelines - List & Read',
        endpoint: `/v2/locations/${locationId}/opportunities/pipelines`,
        method: 'GET' as const,
      },
      // Tags
      {
        name: 'Tags - List & Read',
        endpoint: `/v2/locations/${locationId}/tags`,
        method: 'GET' as const,
      },
      // Calendars
      {
        name: 'Calendars - List & Read',
        endpoint: `/v2/locations/${locationId}/calendars`,
        method: 'GET' as const,
      },
      // Custom Fields
      {
        name: 'Custom Fields - List & Read',
        endpoint: `/v2/locations/${locationId}/customFields?model=contact`,
        method: 'GET' as const,
      },
      // Test basic contact endpoint (for backwards compatibility)
      {
        name: 'Basic Contacts API',
        endpoint: `/contacts?locationId=${locationId}&limit=1`,
        method: 'GET' as const,
      },
      // Test calendars with old format
      {
        name: 'Calendars API (Alternative)',
        endpoint: `/calendars/?locationId=${locationId}`,
        method: 'GET' as const,
      },
    ];

    // Run all tests in parallel
    const results = await Promise.all(
      endpointsToTest.map((test) =>
        testEndpoint(test.name, test.endpoint, test.method, testToken)
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

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorDetails: any = {};
      try {
        const errorData = await response.json();
        errorDetails = errorData;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.msg) {
          errorMessage = errorData.msg;
        }
      } catch {
        // If JSON parsing fails, use status text
        const text = await response.text().catch(() => '');
        errorMessage = text || response.statusText || `HTTP ${response.status}`;
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
