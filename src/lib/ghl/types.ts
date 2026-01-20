/**
 * GoHighLevel API Types
 */

export interface GHLContact {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

export interface GHLContactResponse {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  source?: string;
  tags?: string[];
}

export interface GHLOpportunity {
  contactId: string;
  name: string;
  value?: number;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: 'open' | 'won' | 'lost' | 'abandoned';
  customFields?: Record<string, string>;
}

export interface GHLOpportunityResponse {
  id: string;
  contactId: string;
  name: string;
  value?: number;
  status: string;
}

export interface GHLNote {
  contactId: string;
  body: string;
}

export interface GHLNoteResponse {
  id: string;
  contactId: string;
  body: string;
  createdAt?: string;
}

export interface GHLAppointment {
  contactId: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  notes?: string;
  calendarId?: string;
}

export interface GHLAppointmentResponse {
  id: string;
  contactId: string;
  title: string;
  startTime: string;
  endTime: string;
  notes?: string;
}

export interface GHLLocation {
  id: string;
  name: string;
  timezone?: string;
}

export interface GHLPipeline {
  id: string;
  name: string;
  stages?: Array<{
    id: string;
    name: string;
  }>;
}

export interface GHLAPIError {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}
