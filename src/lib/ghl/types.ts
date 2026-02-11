/**
 * GoHighLevel API Types
 */

export interface GHLContact {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  source?: string;
  tags?: string[];
  customFields?: Record<string, string>;
  // GHL native UTM tracking fields
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
}

export interface GHLContactResponse {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  source?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface GHLOpportunity {
  contactId: string;
  name: string;
  value?: number;
  pipelineId?: string;
  pipelineStageId?: string;
  status?: 'open' | 'won' | 'lost' | 'abandoned';
  assignedTo?: string;   // User ID (opportunity owner)
  source?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

export interface GHLOpportunityResponse {
  id: string;
  contactId: string;
  name: string;
  value?: number;
  status: string;
  pipelineId?: string;
  pipelineStageId?: string;
}

/** Opportunity item returned from GET /opportunities/search */
export interface GHLOpportunitySearchItem extends GHLOpportunityResponse {
  pipelineId?: string;
  pipelineStageId?: string;
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
  assignedTo?: string; // User ID to assign the appointment to
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

/** Full location from GET /locations/{id} (Business Profile). */
export interface GHLLocationFull {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  [key: string]: unknown;
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

export interface GHLConnectionTestResult {
  success: boolean;
  error?: string;
  locationId?: string;
  token?: string;
  results?: Array<{
    name: string;
    success: boolean;
    status?: number;
    message: string;
    endpoint: string;
  }>;
  summary?: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

export interface GHLCustomObject {
  contactId?: string;
  customFields?: Record<string, string>;
}

export interface GHLCustomObjectResponse {
  id: string;
  contactId?: string;
  customFields?: Record<string, string>;
  [key: string]: any; // Allow additional fields from GHL
}

/** Cached GHL user info for session/display */
export interface GHLUserInfo {
  id: string;
  name?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}
