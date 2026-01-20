/**
 * GoHighLevel API Client
 * Handles all communication with GoHighLevel CRM API
 */

import { getGHLToken } from '@/lib/kv';
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
 */
export async function createOrUpdateContact(
  contactData: GHLContact
): Promise<GHLContactResponse> {
  try {
    const payload = {
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      ...(contactData.email && { email: contactData.email }),
      ...(contactData.phone && { phone: contactData.phone }),
      ...(contactData.source && { source: contactData.source }),
      ...(contactData.tags && contactData.tags.length > 0 && { tags: contactData.tags }),
      ...(contactData.customFields && Object.keys(contactData.customFields).length > 0 && {
        customFields: contactData.customFields,
      }),
    };

    // GHL v2 uses /contacts/upsert for create or update
    // Note: locationId should be in payload if needed - will be added by caller if required
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
 */
export async function createOpportunity(
  opportunityData: GHLOpportunity
): Promise<GHLOpportunityResponse> {
  try {
    const payload = {
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
 */
export async function createAppointment(
  appointmentData: GHLAppointment
): Promise<GHLAppointmentResponse> {
  try {
    const payload = {
      contactId: appointmentData.contactId,
      title: appointmentData.title,
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      ...(appointmentData.notes && { notes: appointmentData.notes }),
      ...(appointmentData.calendarId && { calendarId: appointmentData.calendarId }),
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

    // Validate token format (PIT tokens typically start with ghl_pit_)
    if (testToken.trim().length < 20) {
      return { success: false, error: 'Token appears to be invalid (too short)' };
    }

    // Test connection - try multiple endpoints to handle both agency-level and location-level tokens
    // Location-level tokens can't use /locations/search, so we test with contacts endpoint instead
    
    // First try: contacts endpoint (works for both agency and location-level tokens with contacts.write scope)
    let response = await fetch(`${GHL_API_BASE}/contacts?limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${testToken.trim()}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28', // Required for API v2
      },
    });

    // If contacts fails with 401 (missing scope), try locations/search (for agency-level tokens)
    if (response.status === 401) {
      response = await fetch(`${GHL_API_BASE}/locations/search?limit=1`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testToken.trim()}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      });
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
          error: `Unauthorized - Invalid token or missing required scopes. GHL API says: ${details}. Make sure your PIT token has at least one of: contacts.write, contacts.readonly, or locations.readonly` 
        };
      } else if (response.status === 403) {
        const details = errorDetails.message || errorDetails.error || errorMessage;
        // 403 might mean location-level token trying agency endpoint - that's actually OK
        // Let's check if it's a real permission issue by trying contacts
        return { 
          success: false, 
          error: `Forbidden - ${details}. Note: If using a location-level PIT token, you don't need locations.readonly scope. Ensure you have contacts.write scope enabled.` 
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
