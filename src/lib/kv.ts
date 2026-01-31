import { kv } from '@vercel/kv';

const PRICING_KEY = 'pricing:file:2026';
const PRICING_NETWORK_PATH_KEY = 'pricing:network:path';
const GHL_TOKEN_KEY = 'ghl:api:token';
const GHL_LOCATION_ID_KEY = 'ghl:location:id';
const GHL_CONFIG_KEY = 'ghl:config';
const WIDGET_SETTINGS_KEY = 'widget:settings';
const SURVEY_QUESTIONS_KEY = 'survey:questions';
const SERVICE_AREA_POLYGON_KEY = 'service:area:polygon';
const SERVICE_AREA_NETWORK_LINK_KEY = 'service:area:network:link';
const FORM_SETTINGS_KEY = 'admin:form-settings';
const INBOX_META_PREFIX = 'inbox:meta:';

/** Inbox meta (flag/delete) per received email ID. Stored in KV; Resend does not support these. */
export type InboxMeta = { flagged?: boolean; deleted?: boolean };

/** Get inbox meta for a received email (super-admin inbox). */
export async function getInboxMeta(emailId: string): Promise<InboxMeta | null> {
  try {
    const kv = getKV();
    const meta = await kv.get<InboxMeta>(`${INBOX_META_PREFIX}${emailId}`);
    return meta ?? null;
  } catch {
    return null;
  }
}

/** Set inbox meta for a received email. */
export async function setInboxMeta(emailId: string, meta: InboxMeta): Promise<void> {
  const kv = getKV();
  await kv.set(`${INBOX_META_PREFIX}${emailId}`, meta);
}

/** Multi-tenant: build tool-scoped key. When toolId is omitted, use legacy global key for backward compat. */
export function toolKey(toolId: string | undefined, key: string): string {
  if (!toolId) return key;
  return `tool:${toolId}:${key}`;
}

/**
 * Check if KV is configured
 */
function isKVConfigured(): boolean {
  return !!(
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  );
}

/**
 * Get the KV client (lazy initialization)
 * Returns null if KV is not configured (for local dev)
 */
export function getKV() {
  if (!isKVConfigured()) {
    throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN environment variables are required. KV storage is not configured.');
  }
  // KV client is auto-initialized from environment variables
  // Vercel automatically injects: KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN
  return kv;
}

/**
 * Store pricing file buffer in KV storage
 * @param toolId - When provided, data is scoped to this quoting tool (multi-tenant).
 */
export async function storePricingFile(buffer: Buffer, toolId?: string): Promise<void> {
  const kv = getKV();
  const k = toolKey(toolId, PRICING_KEY);
  const base64Data = buffer.toString('base64');
  await kv.set(k, base64Data);
  await kv.set(`${k}:metadata`, {
    uploadedAt: new Date().toISOString(),
    size: buffer.length,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Get pricing file buffer from KV storage
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getPricingFile(toolId?: string): Promise<Buffer> {
  const kv = getKV();
  const k = toolKey(toolId, PRICING_KEY);
  const base64Data = await kv.get<string>(k);
  if (!base64Data) {
    throw new Error(
      `Pricing file not found in KV storage. Please upload a pricing file using the /api/admin/upload-pricing endpoint.`
    );
  }
  return Buffer.from(base64Data, 'base64');
}

/**
 * Get pricing file metadata
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getPricingFileMetadata(toolId?: string) {
  const kv = getKV();
  const k = toolKey(toolId, PRICING_KEY);
  return await kv.get(`${k}:metadata`);
}

/**
 * Check if pricing file exists
 * @param toolId - When provided, checks this quoting tool (multi-tenant).
 */
export async function pricingFileExists(toolId?: string): Promise<boolean> {
  try {
    const kv = getKV();
    const k = toolKey(toolId, PRICING_KEY);
    const exists = await kv.exists(k);
    return exists === 1;
  } catch {
    return false;
  }
}

/**
 * Store network path for pricing file
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function storeNetworkPricingPath(path: string, toolId?: string): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(toolKey(toolId, PRICING_NETWORK_PATH_KEY), path);
  } catch (error) {
    console.error('Error storing network pricing path:', error);
    throw error;
  }
}

/**
 * Get network path for pricing file
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getNetworkPricingPath(toolId?: string): Promise<string | null> {
  try {
    const kv = getKV();
    const path = await kv.get<string>(toolKey(toolId, PRICING_NETWORK_PATH_KEY));
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Delete network path for pricing file
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function deleteNetworkPricingPath(toolId?: string): Promise<void> {
  try {
    const kv = getKV();
    await kv.del(toolKey(toolId, PRICING_NETWORK_PATH_KEY));
  } catch (error) {
    console.error('Error deleting network pricing path:', error);
    throw error;
  }
}

/**
 * GHL credentials and config — single source of truth
 *
 * The entire app must get GHL token, Location ID, and GHL config (calendars, users, etc.)
 * only from here (Admin → KV). Populated via Admin GHL Connection and GHL Config; read
 * via getGHLToken, getGHLLocationId, getGHLConfig. Do not derive or fetch these from
 * any other source (e.g. OAuth/installedLocations).
 */

/**
 * Store GHL API token
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function storeGHLToken(token: string, toolId?: string): Promise<void> {
  const kv = getKV();
  await kv.set(toolKey(toolId, GHL_TOKEN_KEY), token);
}

/**
 * Get GHL API token
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getGHLToken(toolId?: string): Promise<string | null> {
  try {
    const kv = getKV();
    const token = await kv.get<string>(toolKey(toolId, GHL_TOKEN_KEY));
    return token || null;
  } catch (error) {
    console.error('Error retrieving GHL token:', error);
    return null;
  }
}

/**
 * Check if GHL token exists
 * @param toolId - When provided, checks this quoting tool (multi-tenant).
 */
export async function ghlTokenExists(toolId?: string): Promise<boolean> {
  try {
    const kv = getKV();
    const exists = await kv.exists(toolKey(toolId, GHL_TOKEN_KEY));
    return exists === 1;
  } catch {
    return false;
  }
}

/**
 * Store GHL Location ID
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function storeGHLLocationId(locationId: string, toolId?: string): Promise<void> {
  const kv = getKV();
  await kv.set(toolKey(toolId, GHL_LOCATION_ID_KEY), locationId);
}

/**
 * Get GHL Location ID
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getGHLLocationId(toolId?: string): Promise<string | null> {
  try {
    const kv = getKV();
    const locationId = await kv.get<string>(toolKey(toolId, GHL_LOCATION_ID_KEY));
    return locationId || null;
  } catch {
    return null;
  }
}

/**
 * Store GHL configuration (which features are enabled, pipeline settings, etc.)
 */
export async function storeGHLConfig(config: {
  createContact: boolean;
  createOpportunity: boolean;
  createNote: boolean;
  createQuoteObject?: boolean;  // Create Quote custom object in GHL (default true when undefined)
  pipelineId?: string;
  pipelineStageId?: string;
  pipelineRoutingRules?: Array<{ 
    utmParam: string; 
    match: string; 
    value: string; 
    pipelineId: string; 
    pipelineStageId: string;
    opportunityStatus?: string;
    opportunityAssignedTo?: string;
    opportunitySource?: string;
    opportunityTags?: string[];
  }>;
  opportunityStatus?: string;
  opportunityMonetaryValue?: number;
  useDynamicPricingForValue?: boolean;
  opportunityAssignedTo?: string;   // User ID to assign opportunity to (owner)
  opportunitySource?: string;       // Source for the opportunity
  opportunityTags?: string[];       // Tags to add to the opportunity
  inServiceTags?: string[];
  outOfServiceTags?: string[];
  appointmentCalendarId?: string;
  callCalendarId?: string;
  appointmentUserId?: string; // User ID to assign appointment bookings to
  callUserId?: string; // User ID to assign call bookings to
  quotedAmountField?: string; // GHL custom field key for the quoted amount
  redirectAfterAppointment?: boolean; // Whether to redirect after appointment booking
  appointmentRedirectUrl?: string; // URL to redirect to after appointment booking
  appointmentBookedTags?: string[]; // Tags to add when appointment is booked
  quoteCompletedTags?: string[]; // Tags to add when quote is completed
}, toolId?: string): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(toolKey(toolId, GHL_CONFIG_KEY), config);
  } catch (error) {
    console.error('Error storing GHL config:', error);
    throw error;
  }
}

/**
 * Get GHL configuration
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getGHLConfig(toolId?: string): Promise<{
  createContact: boolean;
  createOpportunity: boolean;
  createNote: boolean;
  createQuoteObject?: boolean;  // Create Quote custom object in GHL (default true when undefined)
  pipelineId?: string;
  pipelineStageId?: string;
  pipelineRoutingRules?: Array<{ 
    utmParam: string; 
    match: string; 
    value: string; 
    pipelineId: string; 
    pipelineStageId: string;
    opportunityStatus?: string;
    opportunityAssignedTo?: string;
    opportunitySource?: string;
    opportunityTags?: string[];
  }>;
  opportunityStatus?: string;
  opportunityMonetaryValue?: number;
  useDynamicPricingForValue?: boolean;
  opportunityAssignedTo?: string;   // User ID to assign opportunity to (owner)
  opportunitySource?: string;       // Source for the opportunity
  opportunityTags?: string[];       // Tags to add to the opportunity
  inServiceTags?: string[];
  outOfServiceTags?: string[];
  appointmentCalendarId?: string;
  callCalendarId?: string;
  appointmentUserId?: string; // User ID to assign appointment bookings to
  callUserId?: string; // User ID to assign call bookings to
  quotedAmountField?: string; // GHL custom field key for the quoted amount
  redirectAfterAppointment?: boolean; // Whether to redirect after appointment booking
  appointmentRedirectUrl?: string; // URL to redirect to after appointment booking
  appointmentBookedTags?: string[]; // Tags to add when appointment is booked
  quoteCompletedTags?: string[]; // Tags to add when quote is completed
} | null> {
  try {
    const kv = getKV();
    const config = await kv.get(toolKey(toolId, GHL_CONFIG_KEY));
    return config as any;
  } catch {
    return null;
  }
}

/**
 * Survey Question Types
 */
export interface SurveyQuestionOption {
  value: string;
  label: string;
  skipToQuestionId?: string; // If this option selected, skip to this question ID
}

export interface SurveyQuestion {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'address';
  placeholder?: string;
  required: boolean;
  options?: SurveyQuestionOption[];
  order: number;
  ghlFieldMapping?: string; // Maps to GHL native field (firstName, lastName, email, phone) or custom field key
}

/**
 * DEPRECATED: Use @/lib/survey/manager instead
 * Store survey questions
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function storeSurveyQuestions(questions: SurveyQuestion[], toolId?: string): Promise<void> {
  console.warn('⚠️ storeSurveyQuestions is deprecated. Use survey/manager.saveSurveyQuestions instead');
  try {
    const kv = getKV();
    const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
    await kv.set(toolKey(toolId, SURVEY_QUESTIONS_KEY), sortedQuestions);
  } catch (error) {
    console.error('Error storing survey questions:', error);
    throw error;
  }
}

/**
 * DEPRECATED: Use @/lib/survey/manager instead
 * Get survey questions
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getSurveyQuestions(toolId?: string): Promise<SurveyQuestion[]> {
  console.warn('⚠️ getSurveyQuestions is deprecated. Use survey/manager.getSurveyQuestions instead');
  try {
    const kv = getKV();
    const questions = await kv.get<SurveyQuestion[]>(toolKey(toolId, SURVEY_QUESTIONS_KEY));
    if (!questions || !Array.isArray(questions)) {
      return [];
    }
    return questions.sort((a, b) => a.order - b.order);
  } catch {
    return [];
  }
}

/**
 * Service Area Polygon type: array of [lat, lng] coordinate pairs
 */
export type ServiceAreaPolygon = Array<[number, number]>;

/**
 * Store service area polygon
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function storeServiceAreaPolygon(polygon: ServiceAreaPolygon, toolId?: string): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(toolKey(toolId, SERVICE_AREA_POLYGON_KEY), polygon);
  } catch (error) {
    console.error('Error storing service area polygon:', error);
    throw error;
  }
}

/**
 * Get service area polygon
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getServiceAreaPolygon(toolId?: string): Promise<ServiceAreaPolygon | null> {
  try {
    const kv = getKV();
    const polygon = await kv.get<ServiceAreaPolygon>(toolKey(toolId, SERVICE_AREA_POLYGON_KEY));
    return polygon || null;
  } catch {
    return null;
  }
}

/**
 * Check if service area polygon exists
 * @param toolId - When provided, checks this quoting tool (multi-tenant).
 */
export async function serviceAreaPolygonExists(toolId?: string): Promise<boolean> {
  try {
    const kv = getKV();
    const exists = await kv.exists(toolKey(toolId, SERVICE_AREA_POLYGON_KEY));
    return exists === 1;
  } catch {
    return false;
  }
}

/**
 * Store service area network link URL
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function storeServiceAreaNetworkLink(url: string, toolId?: string): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(toolKey(toolId, SERVICE_AREA_NETWORK_LINK_KEY), url);
  } catch (error) {
    console.error('Error storing service area network link:', error);
    throw error;
  }
}

/**
 * Get service area network link URL
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getServiceAreaNetworkLink(toolId?: string): Promise<string | null> {
  try {
    const kv = getKV();
    const url = await kv.get<string>(toolKey(toolId, SERVICE_AREA_NETWORK_LINK_KEY));
    return url || null;
  } catch {
    return null;
  }
}

/**
 * Delete service area network link
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function deleteServiceAreaNetworkLink(toolId?: string): Promise<void> {
  try {
    const kv = getKV();
    await kv.del(toolKey(toolId, SERVICE_AREA_NETWORK_LINK_KEY));
  } catch (error) {
    console.error('Error deleting service area network link:', error);
    throw error;
  }
}

/** Widget settings shape (title, subtitle, primaryColor). */
export type WidgetSettings = { title: string; subtitle: string; primaryColor: string };

/**
 * Get widget settings
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getWidgetSettings(toolId?: string): Promise<WidgetSettings | null> {
  try {
    const kv = getKV();
    const settings = await kv.get<WidgetSettings>(toolKey(toolId, WIDGET_SETTINGS_KEY));
    return settings || null;
  } catch {
    return null;
  }
}

/**
 * Set widget settings
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function setWidgetSettings(
  settings: { title: string; subtitle: string; primaryColor: string },
  toolId?: string
): Promise<void> {
  const kv = getKV();
  await kv.set(toolKey(toolId, WIDGET_SETTINGS_KEY), settings);
}

/**
 * Get form settings (param names for first name, last name, etc.)
 * @param toolId - When provided, reads from this quoting tool (multi-tenant).
 */
export async function getFormSettings(toolId?: string): Promise<Record<string, unknown> | null> {
  try {
    const kv = getKV();
    const settings = await kv.get<Record<string, unknown>>(toolKey(toolId, FORM_SETTINGS_KEY));
    return settings || null;
  } catch {
    return null;
  }
}

/**
 * Set form settings
 * @param toolId - When provided, scoped to this quoting tool (multi-tenant).
 */
export async function setFormSettings(settings: Record<string, unknown>, toolId?: string): Promise<void> {
  const kv = getKV();
  await kv.set(toolKey(toolId, FORM_SETTINGS_KEY), settings);
}
