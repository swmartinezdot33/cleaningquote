import { kv } from '@vercel/kv';

const PRICING_KEY = 'pricing:file:2026';
const GHL_TOKEN_KEY = 'ghl:api:token';
const GHL_LOCATION_ID_KEY = 'ghl:location:id';
const GHL_CONFIG_KEY = 'ghl:config';
const WIDGET_SETTINGS_KEY = 'widget:settings';
const SURVEY_QUESTIONS_KEY = 'survey:questions';

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
  type: 'text' | 'email' | 'tel' | 'number' | 'select';
  placeholder?: string;
  required: boolean;
  options?: SurveyQuestionOption[];
  order: number;
}

/**
 * Store survey questions
 */
export async function storeSurveyQuestions(questions: SurveyQuestion[]): Promise<void> {
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
 * Get survey questions
 */
export async function getSurveyQuestions(): Promise<SurveyQuestion[]> {
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
