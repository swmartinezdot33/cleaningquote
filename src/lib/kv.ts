import { kv } from '@vercel/kv';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import * as configStore from '@/lib/config/store';
import type { PricingTable } from '@/lib/pricing/types';

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
 * Check if KV is configured (used for inbox meta, quote cache, auth sessions).
 */
function isKVConfigured(): boolean {
  return !!(
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  );
}

/** Throws if Supabase is not configured. Config is Supabase-only. */
function requireSupabaseForConfig(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is required for configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
}

/**
 * Get the KV client (for inbox meta, optional quote cache, auth sessions).
 */
export function getKV() {
  if (!isKVConfigured()) {
    throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN environment variables are required. KV storage is not configured.');
  }
  return kv;
}

/**
 * Store pricing file buffer (Supabase only).
 */
export async function storePricingFile(buffer: Buffer, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setPricingFileBase64InConfig(buffer.toString('base64'), toolId);
  await configStore.setPricingFileMetadataInConfig(
    {
      uploadedAt: new Date().toISOString(),
      size: buffer.length,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
    toolId
  );
}

/**
 * Get pricing file buffer (Supabase only).
 */
export async function getPricingFile(toolId?: string): Promise<Buffer> {
  requireSupabaseForConfig();
  const base64 = await configStore.getPricingFileBase64FromConfig(toolId);
  if (!base64) {
    throw new Error(
      `Pricing file not found. Please upload a pricing file using the /api/admin/upload-pricing endpoint.`
    );
  }
  return Buffer.from(base64, 'base64');
}

/**
 * Get pricing table (Supabase only).
 */
export async function getPricingTable(toolId?: string): Promise<PricingTable | null> {
  requireSupabaseForConfig();
  const p = await configStore.getPricingTableFromConfig(toolId);
  return (p as unknown as PricingTable) || null;
}

/**
 * Set pricing table (Supabase only).
 */
export async function setPricingTable(table: PricingTable | null, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setPricingTableInConfig(table as unknown as Record<string, unknown>, toolId);
}

/**
 * Clear pricing data (Supabase only).
 */
export async function clearPricingData(toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setPricingTableInConfig(null, toolId);
  await configStore.setPricingFileBase64InConfig(null, toolId);
}

/**
 * Get pricing file metadata (Supabase only).
 */
export async function getPricingFileMetadata(toolId?: string) {
  requireSupabaseForConfig();
  const meta = await configStore.getPricingFileMetadataFromConfig(toolId);
  return meta ?? null;
}

/**
 * Check if pricing file exists (Supabase only).
 */
export async function pricingFileExists(toolId?: string): Promise<boolean> {
  requireSupabaseForConfig();
  const base64 = await configStore.getPricingFileBase64FromConfig(toolId);
  return !!base64 && base64.length > 0;
}

/**
 * Store network path for pricing file (Supabase only).
 */
export async function storeNetworkPricingPath(path: string, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setPricingNetworkPathInConfig(path, toolId);
}

/**
 * Get network path for pricing file (Supabase only).
 */
export async function getNetworkPricingPath(toolId?: string): Promise<string | null> {
  requireSupabaseForConfig();
  return configStore.getPricingNetworkPathFromConfig(toolId);
}

/**
 * Delete network path for pricing file (Supabase only).
 */
export async function deleteNetworkPricingPath(toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setPricingNetworkPathInConfig(null, toolId);
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
 * Store GHL API token (Supabase only).
 */
export async function storeGHLToken(token: string, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setGHLToken(token, toolId);
}

/**
 * Get GHL API token (Supabase only).
 */
export async function getGHLToken(toolId?: string): Promise<string | null> {
  requireSupabaseForConfig();
  return configStore.getGHLToken(toolId);
}

/**
 * Check if GHL token exists (Supabase only).
 */
export async function ghlTokenExists(toolId?: string): Promise<boolean> {
  requireSupabaseForConfig();
  return configStore.ghlTokenExists(toolId);
}

/**
 * Store GHL Location ID (Supabase only).
 */
export async function storeGHLLocationId(locationId: string, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setGHLLocationId(locationId, toolId);
}

/**
 * Get GHL Location ID (Supabase only).
 */
export async function getGHLLocationId(toolId?: string): Promise<string | null> {
  requireSupabaseForConfig();
  return configStore.getGHLLocationId(toolId);
}

/**
 * Store GHL configuration (Supabase source of truth when configured).
 */
export async function storeGHLConfig(config: {
  createContact: boolean;
  createOpportunity: boolean;
  createNote: boolean;
  createQuoteObject?: boolean;
  pipelineId?: string;
  pipelineStageId?: string;
  pipelineRoutingRules?: Array<{ utmParam: string; match: string; value: string; pipelineId: string; pipelineStageId: string; opportunityStatus?: string; opportunityAssignedTo?: string; opportunitySource?: string; opportunityTags?: string[] }>;
  opportunityStatus?: string;
  opportunityMonetaryValue?: number;
  useDynamicPricingForValue?: boolean;
  opportunityAssignedTo?: string;
  opportunitySource?: string;
  opportunityTags?: string[];
  inServiceTags?: string[];
  outOfServiceTags?: string[];
  appointmentCalendarId?: string;
  callCalendarId?: string;
  appointmentUserId?: string;
  callUserId?: string;
  quotedAmountField?: string;
  redirectAfterAppointment?: boolean;
  appointmentRedirectUrl?: string;
  appointmentBookedTags?: string[];
  quoteCompletedTags?: string[];
  formIsIframed?: boolean;
}, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setGHLConfig(config as Record<string, unknown>, toolId);
}

/**
 * Get GHL configuration (Supabase source of truth when configured).
 */
export async function getGHLConfig(toolId?: string): Promise<{
  createContact: boolean;
  createOpportunity: boolean;
  createNote: boolean;
  createQuoteObject?: boolean;
  pipelineId?: string;
  pipelineStageId?: string;
  pipelineRoutingRules?: Array<{ utmParam: string; match: string; value: string; pipelineId: string; pipelineStageId: string; opportunityStatus?: string; opportunityAssignedTo?: string; opportunitySource?: string; opportunityTags?: string[] }>;
  opportunityStatus?: string;
  opportunityMonetaryValue?: number;
  useDynamicPricingForValue?: boolean;
  opportunityAssignedTo?: string;
  opportunitySource?: string;
  opportunityTags?: string[];
  inServiceTags?: string[];
  outOfServiceTags?: string[];
  appointmentCalendarId?: string;
  callCalendarId?: string;
  appointmentUserId?: string;
  callUserId?: string;
  quotedAmountField?: string;
  redirectAfterAppointment?: boolean;
  appointmentRedirectUrl?: string;
  appointmentBookedTags?: string[];
  quoteCompletedTags?: string[];
  formIsIframed?: boolean;
} | null> {
  requireSupabaseForConfig();
  const c = await configStore.getGHLConfig(toolId);
  return c as ReturnType<typeof getGHLConfig> extends Promise<infer R> ? R : never;
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
 * DEPRECATED: Use @/lib/survey/manager instead. Store survey questions (Supabase only).
 */
export async function storeSurveyQuestions(questions: SurveyQuestion[], toolId?: string): Promise<void> {
  console.warn('⚠️ storeSurveyQuestions is deprecated. Use survey/manager.saveSurveyQuestions instead');
  requireSupabaseForConfig();
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  await configStore.setSurveyQuestionsInConfig(sorted as unknown as Record<string, unknown>[], toolId);
}

/**
 * DEPRECATED: Use @/lib/survey/manager instead. Get survey questions (Supabase only).
 */
export async function getSurveyQuestions(toolId?: string): Promise<SurveyQuestion[]> {
  console.warn('⚠️ getSurveyQuestions is deprecated. Use survey/manager.getSurveyQuestions instead');
  requireSupabaseForConfig();
  const q = await configStore.getSurveyQuestionsFromConfig(toolId);
  if (!q || !Array.isArray(q)) return [];
  return (q as SurveyQuestion[]).sort((a, b) => a.order - b.order);
}

/**
 * Service Area Polygon type: array of [lat, lng] coordinate pairs
 */
export type ServiceAreaPolygon = Array<[number, number]>;

/**
 * Store service area polygon (Supabase only).
 */
export async function storeServiceAreaPolygon(polygon: ServiceAreaPolygon, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setServiceAreaPolygonInConfig(polygon as unknown as Record<string, unknown>, toolId);
}

/**
 * Get service area polygon (Supabase only).
 */
export async function getServiceAreaPolygon(toolId?: string): Promise<ServiceAreaPolygon | null> {
  requireSupabaseForConfig();
  const p = await configStore.getServiceAreaPolygonFromConfig(toolId);
  return (p as ServiceAreaPolygon) ?? null;
}

/**
 * Check if service area polygon exists (Supabase only).
 */
export async function serviceAreaPolygonExists(toolId?: string): Promise<boolean> {
  requireSupabaseForConfig();
  const p = await configStore.getServiceAreaPolygonFromConfig(toolId);
  return Array.isArray(p) && p.length > 0;
}

/**
 * Store service area network link URL (Supabase only).
 */
export async function storeServiceAreaNetworkLink(url: string, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setServiceAreaNetworkLinkInConfig(url, toolId);
}

/**
 * Get service area network link URL (Supabase only).
 */
export async function getServiceAreaNetworkLink(toolId?: string): Promise<string | null> {
  requireSupabaseForConfig();
  return configStore.getServiceAreaNetworkLinkFromConfig(toolId);
}

/**
 * Delete service area network link (Supabase only).
 */
export async function deleteServiceAreaNetworkLink(toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setServiceAreaNetworkLinkInConfig(null, toolId);
}

/** Widget settings shape (title, subtitle, primaryColor). */
export type WidgetSettings = { title: string; subtitle: string; primaryColor: string };

/**
 * Get widget settings (Supabase only).
 */
export async function getWidgetSettings(toolId?: string): Promise<WidgetSettings | null> {
  requireSupabaseForConfig();
  return configStore.getWidgetSettings(toolId);
}

/**
 * Set widget settings (Supabase only).
 */
export async function setWidgetSettings(
  settings: { title: string; subtitle: string; primaryColor: string },
  toolId?: string
): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setWidgetSettings(settings, toolId);
}

/**
 * Get form settings (Supabase only).
 */
export async function getFormSettings(toolId?: string): Promise<Record<string, unknown> | null> {
  requireSupabaseForConfig();
  return configStore.getFormSettings(toolId);
}

/**
 * Set form settings (Supabase only).
 */
export async function setFormSettings(settings: Record<string, unknown>, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setFormSettings(settings, toolId);
}

/** Get tracking codes (Supabase only). */
export async function getTrackingCodes(toolId?: string): Promise<configStore.TrackingCodesSettings | null> {
  requireSupabaseForConfig();
  return configStore.getTrackingCodes(toolId);
}

/** Set tracking codes (Supabase only). */
export async function setTrackingCodes(settings: configStore.TrackingCodesSettings, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setTrackingCodes(settings, toolId);
}

/** Get initial cleaning config (Supabase only). */
export async function getInitialCleaningConfig(toolId?: string): Promise<configStore.InitialCleaningConfig | null> {
  requireSupabaseForConfig();
  return configStore.getInitialCleaningConfig(toolId);
}

/** Set initial cleaning config (Supabase only). */
export async function setInitialCleaningConfig(config: configStore.InitialCleaningConfig, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setInitialCleaningConfig(config, toolId);
}

/** Get Google Maps API key (Supabase only). */
export async function getGoogleMapsKey(toolId?: string): Promise<string | null> {
  requireSupabaseForConfig();
  return configStore.getGoogleMapsKey(toolId);
}

/** Set Google Maps API key (Supabase only). */
export async function setGoogleMapsKey(key: string | null, toolId?: string): Promise<void> {
  requireSupabaseForConfig();
  await configStore.setGoogleMapsKey(key, toolId);
}
