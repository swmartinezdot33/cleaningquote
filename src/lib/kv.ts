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
 */
export async function storePricingFile(buffer: Buffer): Promise<void> {
  const kv = getKV();
  
  // Convert buffer to base64 string for storage
  const base64Data = buffer.toString('base64');
  
  await kv.set(PRICING_KEY, base64Data);
  await kv.set(`${PRICING_KEY}:metadata`, {
    uploadedAt: new Date().toISOString(),
    size: buffer.length,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Get pricing file buffer from KV storage
 */
export async function getPricingFile(): Promise<Buffer> {
  const kv = getKV();
  
  const base64Data = await kv.get<string>(PRICING_KEY);
  
  if (!base64Data) {
    throw new Error(
      `Pricing file not found in KV storage. Please upload a pricing file using the /api/admin/upload-pricing endpoint.`
    );
  }
  
  return Buffer.from(base64Data, 'base64');
}

/**
 * Get pricing file metadata
 */
export async function getPricingFileMetadata() {
  const kv = getKV();
  return await kv.get(`${PRICING_KEY}:metadata`);
}

/**
 * Check if pricing file exists
 */
export async function pricingFileExists(): Promise<boolean> {
  try {
    const kv = getKV();
    const exists = await kv.exists(PRICING_KEY);
    return exists === 1;
  } catch {
    return false;
  }
}

/**
 * Store network path for pricing file
 */
export async function storeNetworkPricingPath(path: string): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(PRICING_NETWORK_PATH_KEY, path);
  } catch (error) {
    console.error('Error storing network pricing path:', error);
    throw error;
  }
}

/**
 * Get network path for pricing file
 */
export async function getNetworkPricingPath(): Promise<string | null> {
  try {
    const kv = getKV();
    const path = await kv.get<string>(PRICING_NETWORK_PATH_KEY);
    return path || null;
  } catch {
    return null;
  }
}

/**
 * Delete network path for pricing file
 */
export async function deleteNetworkPricingPath(): Promise<void> {
  try {
    const kv = getKV();
    await kv.del(PRICING_NETWORK_PATH_KEY);
  } catch (error) {
    console.error('Error deleting network pricing path:', error);
    throw error;
  }
}

/**
 * Store GHL API token
 */
export async function storeGHLToken(token: string): Promise<void> {
  const kv = getKV();
  await kv.set(GHL_TOKEN_KEY, token);
}

/**
 * Get GHL API token
 */
export async function getGHLToken(): Promise<string> {
  const kv = getKV();
  const token = await kv.get<string>(GHL_TOKEN_KEY);
  
  if (!token) {
    throw new Error('GHL API token not configured. Please set it in the admin settings.');
  }
  
  return token;
}

/**
 * Check if GHL token exists
 */
export async function ghlTokenExists(): Promise<boolean> {
  try {
    const kv = getKV();
    const exists = await kv.exists(GHL_TOKEN_KEY);
    return exists === 1;
  } catch {
    return false;
  }
}

/**
 * Store GHL Location ID
 */
export async function storeGHLLocationId(locationId: string): Promise<void> {
  const kv = getKV();
  await kv.set(GHL_LOCATION_ID_KEY, locationId);
}

/**
 * Get GHL Location ID
 */
export async function getGHLLocationId(): Promise<string | null> {
  try {
    const kv = getKV();
    const locationId = await kv.get<string>(GHL_LOCATION_ID_KEY);
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
  pipelineId?: string;
  pipelineStageId?: string;
  opportunityStatus?: string;
  opportunityMonetaryValue?: number;
  useDynamicPricingForValue?: boolean;
  inServiceTags?: string[];
  outOfServiceTags?: string[];
  appointmentCalendarId?: string;
  callCalendarId?: string;
  quotedAmountField?: string; // GHL custom field key for the quoted amount
}): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(GHL_CONFIG_KEY, config);
  } catch (error) {
    console.error('Error storing GHL config:', error);
    throw error;
  }
}

/**
 * Get GHL configuration
 */
export async function getGHLConfig(): Promise<{
  createContact: boolean;
  createOpportunity: boolean;
  createNote: boolean;
  pipelineId?: string;
  pipelineStageId?: string;
  opportunityStatus?: string;
  opportunityMonetaryValue?: number;
  useDynamicPricingForValue?: boolean;
  inServiceTags?: string[];
  outOfServiceTags?: string[];
  appointmentCalendarId?: string;
  callCalendarId?: string;
  quotedAmountField?: string; // GHL custom field key for the quoted amount
} | null> {
  try {
    const kv = getKV();
    const config = await kv.get(GHL_CONFIG_KEY);
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
 * 
 * Store survey questions
 */
export async function storeSurveyQuestions(questions: SurveyQuestion[]): Promise<void> {
  console.warn('⚠️ storeSurveyQuestions is deprecated. Use survey/manager.saveSurveyQuestions instead');
  try {
    const kv = getKV();
    // Sort by order before storing
    const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
    await kv.set(SURVEY_QUESTIONS_KEY, sortedQuestions);
  } catch (error) {
    console.error('Error storing survey questions:', error);
    throw error;
  }
}

/**
 * DEPRECATED: Use @/lib/survey/manager instead
 * 
 * Get survey questions
 */
export async function getSurveyQuestions(): Promise<SurveyQuestion[]> {
  console.warn('⚠️ getSurveyQuestions is deprecated. Use survey/manager.getSurveyQuestions instead');
  try {
    const kv = getKV();
    const questions = await kv.get<SurveyQuestion[]>(SURVEY_QUESTIONS_KEY);
    if (!questions || !Array.isArray(questions)) {
      return [];
    }
    // Ensure sorted by order
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
 */
export async function storeServiceAreaPolygon(polygon: ServiceAreaPolygon): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(SERVICE_AREA_POLYGON_KEY, polygon);
  } catch (error) {
    console.error('Error storing service area polygon:', error);
    throw error;
  }
}

/**
 * Get service area polygon
 */
export async function getServiceAreaPolygon(): Promise<ServiceAreaPolygon | null> {
  try {
    const kv = getKV();
    const polygon = await kv.get<ServiceAreaPolygon>(SERVICE_AREA_POLYGON_KEY);
    return polygon || null;
  } catch {
    return null;
  }
}

/**
 * Check if service area polygon exists
 */
export async function serviceAreaPolygonExists(): Promise<boolean> {
  try {
    const kv = getKV();
    const exists = await kv.exists(SERVICE_AREA_POLYGON_KEY);
    return exists === 1;
  } catch {
    return false;
  }
}

/**
 * Store service area network link URL
 */
export async function storeServiceAreaNetworkLink(url: string): Promise<void> {
  try {
    const kv = getKV();
    await kv.set(SERVICE_AREA_NETWORK_LINK_KEY, url);
  } catch (error) {
    console.error('Error storing service area network link:', error);
    throw error;
  }
}

/**
 * Get service area network link URL
 */
export async function getServiceAreaNetworkLink(): Promise<string | null> {
  try {
    const kv = getKV();
    const url = await kv.get<string>(SERVICE_AREA_NETWORK_LINK_KEY);
    return url || null;
  } catch {
    return null;
  }
}

/**
 * Delete service area network link
 */
export async function deleteServiceAreaNetworkLink(): Promise<void> {
  try {
    const kv = getKV();
    await kv.del(SERVICE_AREA_NETWORK_LINK_KEY);
  } catch (error) {
    console.error('Error deleting service area network link:', error);
    throw error;
  }
}
