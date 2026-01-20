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
        'Version': '2021-07-28', // Required for API v2
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
 * For location-level tokens, locationId is required in the body
 */
export async function createOrUpdateContact(
  contactData: GHLContact,
  locationId?: string
): Promise<GHLContactResponse> {
  try {
    // Get locationId if not provided (for location-level tokens)
    let finalLocationId = locationId;
    if (!finalLocationId) {
      // First try to get from stored locationId (from settings)
      finalLocationId = (await getGHLLocationId()) || undefined;
      // If not stored, try to get from token
      if (!finalLocationId) {
        finalLocationId = await getLocationIdFromToken() || undefined;
      }
    }

    const payload: Record<string, any> = {
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      ...(contactData.email && { email: contactData.email }),
      ...(contactData.phone && { phone: contactData.phone }),
      ...(contactData.source && { source: contactData.source }),
      ...(contactData.tags && contactData.tags.length > 0 && { tags: contactData.tags }),
      ...(contactData.customFields && Object.keys(contactData.customFields).length > 0 && {
        customFields: contactData.customFields,
      }),
      // Include locationId for API v2 (required for location-level tokens, optional for agency-level)
      ...(finalLocationId && { locationId: finalLocationId }),
    };

    // GHL v2 uses /contacts/upsert for create or update
    const response = await makeGHLRequest<{ contact: GHLContactResponse }>(
      '/contacts/upsert',
      'POST',
      payload
    );

    return response.contact;
  } catch (error) {
    console.error('Failed to create/update contact:', error);
    throw error;
  }
}

/**
 * Create an opportunity in GHL
 * For location-level tokens, locationId is required in the body
 */
export async function createOpportunity(
  opportunityData: GHLOpportunity,
  locationId?: string
): Promise<GHLOpportunityResponse> {
  try {
    // Get locationId if not provided (for location-level tokens)
    let finalLocationId = locationId;
    if (!finalLocationId) {
      // First try to get from stored locationId (from settings)
      finalLocationId = (await getGHLLocationId()) || undefined;
      // If not stored, try to get from token
      if (!finalLocationId) {
        finalLocationId = await getLocationIdFromToken() || undefined;
      }
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
      // Include locationId for API v2 (required for location-level tokens, optional for agency-level)
      ...(finalLocationId && { locationId: finalLocationId }),
    };

    const response = await makeGHLRequest<{ opportunity: GHLOpportunityResponse }>(
      '/opportunities',
      'POST',
      payload
    );

    return response.opportunity;
  } catch (error) {
    console.error('Failed to create opportunity:', error);
    throw error;
  }
}

/**
 * Add a note to a contact in GHL
 */
export async function createNote(noteData: GHLNote): Promise<GHLNoteResponse> {
  try {
    const payload = {
      body: noteData.body,
    };

    const response = await makeGHLRequest<{ note: GHLNoteResponse }>(
      `/contacts/${noteData.contactId}/notes`,
      'POST',
      payload
    );

    return response.note;
  } catch (error) {
    console.error('Failed to create note:', error);
    throw error;
  }
}

/**
 * Create an appointment in GHL
 * For location-level tokens, locationId is required in the body
 */
export async function createAppointment(
  appointmentData: GHLAppointment,
  locationId?: string
): Promise<GHLAppointmentResponse> {
  try {
    // Get locationId if not provided (for location-level tokens)
    let finalLocationId = locationId;
    if (!finalLocationId) {
      // First try to get from stored locationId (from settings)
      finalLocationId = (await getGHLLocationId()) || undefined;
      // If not stored, try to get from token
      if (!finalLocationId) {
        finalLocationId = await getLocationIdFromToken() || undefined;
      }
    }

    const payload: Record<string, any> = {
      contactId: appointmentData.contactId,
      title: appointmentData.title,
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      ...(appointmentData.notes && { notes: appointmentData.notes }),
      ...(appointmentData.calendarId && { calendarId: appointmentData.calendarId }),
      // Include locationId for API v2 (required for location-level tokens, optional for agency-level)
      ...(finalLocationId && { locationId: finalLocationId }),
    };

    const response = await makeGHLRequest<{ appointment: GHLAppointmentResponse }>(
      '/appointments',
      'POST',
      payload
    );

    return response.appointment;
  } catch (error) {
    console.error('Failed to create appointment:', error);
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
 */
export async function getPipelines(locationId: string): Promise<GHLPipeline[]> {
  try {
    const response = await makeGHLRequest<{ pipelines: GHLPipeline[] }>(
      `/locations/${locationId}/pipelines`,
      'GET'
    );

    return response.pipelines || [];
  } catch (error) {
    console.error('Failed to get pipelines:', error);
    throw error;
  }
}

/**
 * Test GHL API connection with a specific token (optional)
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

    // For location-level tokens, try to get locationId from /oauth/installedLocations first
    // If that fails (403/401), try alternative approach
    let locationId: string | null = null;
    let response = await fetch(`${GHL_API_BASE}/oauth/installedLocations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken.trim()}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
    });

    if (response.ok) {
      try {
        const data = await response.json();
        const locations = data.locations || data.data || [];
        if (locations.length > 0) {
          locationId = locations[0].id;
        }
      } catch {
        // If parsing fails, continue without locationId
      }
    }

    // Test with contacts endpoint - works with contacts.write/readonly scope
    // For location-level tokens, we need locationId. If we don't have it, try without it first
    let testEndpoint = `${GHL_API_BASE}/contacts?limit=1`;
    if (locationId) {
      testEndpoint = `${GHL_API_BASE}/contacts?locationId=${locationId}&limit=1`;
    }

    response = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken.trim()}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
    });

    // If it fails with 400 (bad request) and we didn't have locationId, it might need locationId
    // For location-level tokens, try to create a test contact to get locationId from error
    if (!response.ok && response.status === 400 && !locationId) {
      // Try a minimal POST to /contacts/upsert to see if we get location info from error
      const testContactResponse = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testToken.trim()}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'Connection',
        }),
      });

      if (testContactResponse.ok) {
        // If POST works without locationId, token is valid
        return { success: true };
      }

      // Parse error to see if it mentions locationId
      try {
        const errorData = await testContactResponse.json();
        const errorText = JSON.stringify(errorData);
        // If error mentions location, try to extract it or just accept the token is valid but needs locationId
        if (errorText.includes('location') || errorText.includes('Location')) {
          // Token is valid, just needs locationId (which we'll get at runtime)
          return { success: true };
        }
      } catch {
        // Continue with original error handling
      }
    }

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
          error: `Forbidden - ${details}. If using a location-level PIT token, ensure you have contacts.write scope enabled.` 
        };
      } else if (response.status === 400) {
        // 400 might mean missing locationId - but token is valid
        // For location-level tokens, we'll handle locationId at runtime
        return { success: true };
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
