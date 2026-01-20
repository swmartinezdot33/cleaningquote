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

const GHL_API_BASE = 'https://rest.gohighlevel.com/v1';

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

    // GHL uses /contacts/upsert for create or update
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
 * Test GHL API connection
 */
export async function testGHLConnection(): Promise<boolean> {
  try {
    const token = await getGHLToken();

    if (!token) {
      return false;
    }

    // Simple test: try to fetch account info or any basic endpoint
    const response = await fetch(`${GHL_API_BASE}/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('GHL connection test failed:', error);
    return false;
  }
}
