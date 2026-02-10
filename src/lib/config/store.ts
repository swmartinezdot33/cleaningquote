/**
 * Tool config store — Supabase as source of truth for pricing, survey, widget, GHL, form, tracking, etc.
 * Use this from API routes and libs; KV is kept only for cache and ephemeral data (e.g. inbox meta).
 */

import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import type { Json, ToolConfigRow, ToolConfigUpdate } from '@/lib/supabase/types';
import { normalizeHexColor } from '@/lib/utils/color';

export type WidgetSettings = { title: string; subtitle: string; primaryColor: string };

/** Brand purple – default when no color set or transparent */
const BRAND_PRIMARY_COLOR = '#7c3aed';

/** Resolve config row: tool_id = toolId when provided, else tool_id is null (global). */
async function getConfigRow(toolId?: string): Promise<ToolConfigRow | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseServer();
  const query = supabase.from('tool_config').select('*');
  const { data, error } = toolId
    ? await query.eq('tool_id', toolId).maybeSingle()
    : await query.is('tool_id', null).maybeSingle();
  if (error) {
    console.error('tool_config getConfigRow:', error);
    return null;
  }
  return data;
}

/** Upsert config row for toolId (null = global). Creates row if missing. */
async function upsertConfig(toolId: string | undefined, updates: Partial<ToolConfigUpdate>): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createSupabaseServer();
  const updated_at = new Date().toISOString();
  const payload = { ...updates, updated_at };

  if (toolId === undefined || toolId === null) {
    const { data: raw } = await supabase
      .from('tool_config')
      .select('id')
      .is('tool_id', null as unknown as boolean)
      .maybeSingle();
    const existing = raw as { id: string } | null;
    if (existing?.id) {
      // @ts-expect-error Supabase generated types can infer 'never' for new table updates
      const { error } = await supabase.from('tool_config').update(payload).eq('id', existing.id);
      if (error) {
        console.error('tool_config update global:', error);
        throw error;
      }
    } else {
      // @ts-expect-error Supabase generated types can infer 'never' for new table inserts
      const { error } = await supabase.from('tool_config').insert({ ...payload, tool_id: null });
      if (error) {
        console.error('tool_config insert global:', error);
        throw error;
      }
    }
    return;
  }

  // @ts-expect-error Supabase generated types can infer 'never' for new table upsert
  const { error } = await supabase.from('tool_config').upsert(
    { ...payload, tool_id: toolId },
    { onConflict: 'tool_id' }
  );
  if (error) {
    console.error('tool_config upsert:', error);
    throw error;
  }
}

/**
 * Create or reset this tool's config row with preset only: site customization (title, subtitle, color) and survey questions.
 * Call once when a tool is created so every tool always has its own config. Never uses global row.
 * When ghlLocationId is provided, the tool is associated with that GHL location (visible in Tools list for that location).
 */
export async function createToolConfigPreset(
  toolId: string,
  widget: WidgetSettings,
  surveyQuestions: unknown[],
  ghlLocationId?: string | null
): Promise<void> {
  await upsertConfig(toolId, {
    widget_settings: widget as unknown as Json,
    survey_questions: surveyQuestions as unknown as Json,
    ...(ghlLocationId ? { ghl_location_id: ghlLocationId } : {}),
  });
}

/**
 * Set the GHL location ID for a tool's config (so the tool appears in that location's Tools list).
 */
export async function setToolConfigGhlLocationId(
  toolId: string,
  ghlLocationId: string | null
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await upsertConfig(toolId, { ghl_location_id: ghlLocationId });
}

// ---- Widget ----
/** Normalize widget_settings from DB (camelCase or snake_case). Always return WidgetSettings shape so widget always loads from DB. */
function normalizeWidgetSettings(raw: unknown): WidgetSettings | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const title = typeof o.title === 'string' ? o.title : '';
  const subtitle = typeof o.subtitle === 'string' ? o.subtitle : '';
  const rawColor =
    typeof o.primaryColor === 'string'
      ? o.primaryColor
      : typeof o.primary_color === 'string'
        ? o.primary_color
        : '';
  const primaryColor = normalizeHexColor(rawColor) ?? BRAND_PRIMARY_COLOR;
  return { title, subtitle, primaryColor };
}

export async function getWidgetSettings(toolId?: string): Promise<WidgetSettings | null> {
  const row = await getConfigRow(toolId);
  const raw = row?.widget_settings;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return normalizeWidgetSettings(parsed);
    } catch {
      return null;
    }
  }
  return normalizeWidgetSettings(raw);
}

export async function setWidgetSettings(
  settings: { title: string; subtitle: string; primaryColor: string },
  toolId?: string
): Promise<void> {
  await upsertConfig(toolId, { widget_settings: settings as unknown as Json });
}

// ---- Form ----
export async function getFormSettings(toolId?: string): Promise<Record<string, unknown> | null> {
  const row = await getConfigRow(toolId);
  const s = row?.form_settings as Record<string, unknown> | null | undefined;
  return s && typeof s === 'object' ? s : null;
}

export async function setFormSettings(settings: Record<string, unknown>, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { form_settings: settings as unknown as Json });
}

// ---- Tracking ----
export type TrackingCodesSettings = {
  customHeadCode?: string;
  trackingQuoteSummary?: string;
  trackingAppointmentBooking?: string;
};

export async function getTrackingCodes(toolId?: string): Promise<TrackingCodesSettings | null> {
  const row = await getConfigRow(toolId);
  const s = row?.tracking_codes as TrackingCodesSettings | null | undefined;
  return s && typeof s === 'object' ? s : null;
}

export async function setTrackingCodes(settings: TrackingCodesSettings, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { tracking_codes: settings as Json });
}

// ---- Initial cleaning ----
export interface InitialCleaningConfig {
  multiplier: number;
  requiredConditions: string[];
  recommendedConditions: string[];
  sheddingPetsMultiplier?: number;
  peopleMultiplier?: number;
  /** People at or below this count get no multiplier; above this, per-person multiplier applies. Default 4. */
  peopleMultiplierBase?: number;
  /** Shedding pets at or below this count get no multiplier; above this, per-pet multiplier applies. Default 0. */
  sheddingPetsMultiplierBase?: number;
}

export async function getInitialCleaningConfig(toolId?: string): Promise<InitialCleaningConfig | null> {
  const row = await getConfigRow(toolId);
  const s = row?.initial_cleaning_config as InitialCleaningConfig | null | undefined;
  return s && typeof s === 'object' ? s : null;
}

export async function setInitialCleaningConfig(config: InitialCleaningConfig, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { initial_cleaning_config: config as unknown as Json });
}

// ---- Google Maps key ----
export async function getGoogleMapsKey(toolId?: string): Promise<string | null> {
  const row = await getConfigRow(toolId);
  const k = row?.google_maps_key;
  return typeof k === 'string' ? k : null;
}

export async function setGoogleMapsKey(key: string | null, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { google_maps_key: key });
}

// ---- GHL (org-level connection; per-tool CRM config below) ----
/** Get org_id for a tool (for resolving org-level GHL). */
export async function getOrgIdFromToolId(toolId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !toolId) return null;
  const supabase = createSupabaseServer();
  const { data, error } = await supabase.from('tools').select('org_id').eq('id', toolId).maybeSingle();
  if (error || !data) return null;
  const orgId = (data as { org_id: string | null }).org_id;
  return typeof orgId === 'string' ? orgId : null;
}

/** Read org-level GHL settings (one connection per org). */
async function getOrgGHLRow(
  orgId: string
): Promise<{ ghl_token: string | null; ghl_location_id: string | null; ghl_use_oauth: boolean } | null> {
  if (!isSupabaseConfigured() || !orgId) return null;
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('organizations')
    .select('ghl_token, ghl_location_id, ghl_use_oauth')
    .eq('id', orgId)
    .maybeSingle();
  if (error) {
    console.error('organizations getOrgGHLRow:', error);
    return null;
  }
  const row = data as { ghl_token?: string | null; ghl_location_id?: string | null; ghl_use_oauth?: boolean } | null;
  if (!row) return null;
  return {
    ghl_token: row.ghl_token ?? null,
    ghl_location_id: row.ghl_location_id ?? null,
    ghl_use_oauth: row.ghl_use_oauth === true,
  };
}

export async function getGHLTokenForOrg(orgId: string): Promise<string | null> {
  const row = await getOrgGHLRow(orgId);
  if (!row) return null;
  if (row.ghl_use_oauth && row.ghl_location_id) {
    const { getOrFetchTokenForLocation } = await import('@/lib/ghl/token-store');
    return await getOrFetchTokenForLocation(row.ghl_location_id);
  }
  const t = row.ghl_token;
  return typeof t === 'string' ? t : null;
}

export async function getGHLLocationIdForOrg(orgId: string): Promise<string | null> {
  const row = await getOrgGHLRow(orgId);
  const id = row?.ghl_location_id;
  return typeof id === 'string' ? id : null;
}

export async function getOrgGHLUseOAuth(orgId: string): Promise<boolean> {
  const row = await getOrgGHLRow(orgId);
  return row?.ghl_use_oauth === true;
}

export async function setOrgGHL(orgId: string, token: string, locationId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createSupabaseServer();
  const updated_at = new Date().toISOString();
  const { error } = await (supabase as any)
    .from('organizations')
    .update({ ghl_token: token, ghl_location_id: locationId, ghl_use_oauth: false, updated_at })
    .eq('id', orgId);
  if (error) {
    console.error('organizations setOrgGHL:', error);
    throw error;
  }
}

/** Link org to GHL via OAuth (token from token store by locationId). */
export async function setOrgGHLOAuth(orgId: string, locationId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createSupabaseServer();
  const updated_at = new Date().toISOString();
  const { error } = await (supabase as any)
    .from('organizations')
    .update({ ghl_token: null, ghl_location_id: locationId, ghl_use_oauth: true, updated_at })
    .eq('id', orgId);
  if (error) {
    console.error('organizations setOrgGHLOAuth:', error);
    throw error;
  }
}

/** Clear org GHL connection. */
export async function clearOrgGHL(orgId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createSupabaseServer();
  const updated_at = new Date().toISOString();
  const { error } = await (supabase as any)
    .from('organizations')
    .update({ ghl_location_id: null, ghl_token: null, ghl_use_oauth: false, updated_at })
    .eq('id', orgId);
  if (error) {
    console.error('organizations clearOrgGHL:', error);
    throw error;
  }
}

/** Get org IDs linked to this GHL location (for listing tools, service areas, pricing when using GHL session).
 * Org and location are the same entity: we use org id in Supabase, GHL uses LocationID; tied in organizations.ghl_location_id.
 * One org per ghl_location_id (enforced by unique constraint). Use ensureOrgForGHLLocation when no row exists. */
export async function getOrgIdsByGHLLocationId(locationId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !locationId?.trim()) return [];
  const supabase = createSupabaseServer();
  const loc = locationId.trim();

  const { data: rows, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('ghl_location_id', loc);
  if (!error && Array.isArray(rows) && rows.length > 0) {
    const ids = (rows as Array<{ id: string }>).map((r) => r?.id).filter((id): id is string => !!id);
    if (ids.length > 0) return [ids[0]];
  }

  return [];
}

/** Ensure exactly one org exists for this GHL location (1 org = 1 GHL sub-account). Creates org with ghl_location_id if none. Returns org id or null. */
export async function ensureOrgForGHLLocation(locationId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !locationId?.trim()) return null;
  const existing = await getOrgIdsByGHLLocationId(locationId);
  if (existing.length > 0) return existing[0];

  const supabase = createSupabaseServer();
  const loc = locationId.trim();
  const updated_at = new Date().toISOString();
  const slugBase = 'loc-' + loc.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24) || loc.slice(0, 28);
  let slug = slugBase;
  let attempt = 0;
  while (attempt < 10) {
    const { data: existingOrg } = await supabase.from('organizations').select('id').eq('slug', slug).maybeSingle();
    if (existingOrg && (existingOrg as { id: string }).id) {
      const orgId = (existingOrg as { id: string }).id;
      await (supabase as any)
        .from('organizations')
        .update({ ghl_location_id: loc, ghl_token: null, ghl_use_oauth: true, updated_at })
        .eq('id', orgId);
      return orgId;
    }
    const { data: inserted, error: insertError } = await (supabase as any)
      .from('organizations')
      .insert({
        name: 'Location',
        slug,
        ghl_location_id: loc,
        ghl_token: null,
        ghl_use_oauth: true,
        updated_at,
      })
      .select('id')
      .single();
    if (!insertError && inserted?.id) return (inserted as { id: string }).id;
    attempt++;
    slug = `${slugBase}-${attempt}`;
  }
  return null;
}

/** Get tool IDs whose tool_config.ghl_location_id matches this GHL location (for Tools page visibility). */
export async function getToolIdsByGHLLocationId(locationId: string): Promise<string[]> {
  if (!isSupabaseConfigured() || !locationId?.trim()) return [];
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('tool_config')
    .select('tool_id')
    .eq('ghl_location_id', locationId.trim())
    .not('tool_id', 'is', null);
  if (error) {
    console.warn('tool_config getToolIdsByGHLLocationId:', error);
    return [];
  }
  const rows = (data ?? []) as Array<{ tool_id: string | null }>;
  return rows.map((r) => r.tool_id).filter((id): id is string => typeof id === 'string' && id.length > 0);
}

/** Get GHL token: when toolId is provided, use org-level GHL for that tool's org; else legacy global tool_config. */
export async function getGHLToken(toolId?: string): Promise<string | null> {
  if (toolId) {
    const orgId = await getOrgIdFromToolId(toolId);
    if (orgId) {
      const t = await getGHLTokenForOrg(orgId);
      if (t) return t;
    }
    const row = await getConfigRow(toolId);
    const t = row?.ghl_token;
    return typeof t === 'string' ? t : null;
  }
  const row = await getConfigRow(undefined);
  const t = row?.ghl_token;
  return typeof t === 'string' ? t : null;
}

export async function setGHLToken(token: string, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { ghl_token: token });
}

/** Get GHL location ID: when toolId is provided, use org-level GHL for that tool's org; else legacy global tool_config. */
export async function getGHLLocationId(toolId?: string): Promise<string | null> {
  if (toolId) {
    const orgId = await getOrgIdFromToolId(toolId);
    if (orgId) {
      const id = await getGHLLocationIdForOrg(orgId);
      if (id) return id;
    }
    const row = await getConfigRow(toolId);
    const id = row?.ghl_location_id;
    return typeof id === 'string' ? id : null;
  }
  const row = await getConfigRow(undefined);
  const id = row?.ghl_location_id;
  return typeof id === 'string' ? id : null;
}

export async function setGHLLocationId(locationId: string, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { ghl_location_id: locationId });
}

export async function ghlTokenExists(toolId?: string): Promise<boolean> {
  const token = await getGHLToken(toolId);
  return !!token && token.length > 0;
}

export async function getGHLConfig(toolId?: string): Promise<Record<string, unknown> | null> {
  const row = await getConfigRow(toolId);
  const c = row?.ghl_config as Record<string, unknown> | null | undefined;
  return c && typeof c === 'object' ? c : null;
}

export async function setGHLConfig(config: Record<string, unknown>, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { ghl_config: config as Json });
}

// ---- Survey questions ----
/** Parse survey_questions: array, JSON string (single or double-encoded), or object with .questions/.data. */
function parseSurveyQuestionsRaw(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const first = JSON.parse(raw) as unknown;
      if (Array.isArray(first)) return first;
      if (first && typeof first === 'object' && !Array.isArray(first)) {
        const o = first as Record<string, unknown>;
        if (Array.isArray(o.questions)) return o.questions;
        if (Array.isArray(o.data)) return o.data;
      }
      if (typeof first === 'string') {
        try {
          const second = JSON.parse(first) as unknown;
          return Array.isArray(second) ? second : null;
        } catch {
          return null;
        }
      }
      return null;
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.questions)) return o.questions;
    if (Array.isArray(o.data)) return o.data;
  }
  return null;
}

export async function getSurveyQuestionsFromConfig(toolId?: string): Promise<unknown[] | null> {
  const row = await getConfigRow(toolId);
  const raw = row?.survey_questions;
  return parseSurveyQuestionsRaw(raw);
}

export async function setSurveyQuestionsInConfig(questions: unknown[], toolId?: string): Promise<void> {
  await upsertConfig(toolId, { survey_questions: questions as unknown as Json });
}

// ---- Pricing ----
export async function getPricingTableFromConfig(toolId?: string): Promise<Record<string, unknown> | null> {
  const row = await getConfigRow(toolId);
  const p = row?.pricing_table as Record<string, unknown> | null | undefined;
  return p && typeof p === 'object' ? p : null;
}

export async function setPricingTableInConfig(table: Record<string, unknown> | null, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { pricing_table: table as unknown as Json | null });
}

export async function getPricingFileBase64FromConfig(toolId?: string): Promise<string | null> {
  const row = await getConfigRow(toolId);
  const b = row?.pricing_file_base64;
  return typeof b === 'string' ? b : null;
}

export async function setPricingFileBase64InConfig(base64: string | null, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { pricing_file_base64: base64 });
}

export type PricingFileMetadata = {
  uploadedAt?: string;
  size?: number;
  contentType?: string;
};

export async function getPricingFileMetadataFromConfig(toolId?: string): Promise<PricingFileMetadata | null> {
  const row = await getConfigRow(toolId);
  const m = row?.pricing_file_metadata as PricingFileMetadata | null | undefined;
  return m && typeof m === 'object' ? m : null;
}

export async function setPricingFileMetadataInConfig(
  meta: PricingFileMetadata | null,
  toolId?: string
): Promise<void> {
  await upsertConfig(toolId, { pricing_file_metadata: meta as unknown as Json });
}

export async function getPricingNetworkPathFromConfig(toolId?: string): Promise<string | null> {
  const row = await getConfigRow(toolId);
  const p = row?.pricing_network_path;
  return typeof p === 'string' ? p : null;
}

export async function setPricingNetworkPathInConfig(path: string | null, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { pricing_network_path: path });
}

/** Get the tool's selected pricing structure id (from tool_config). When set, quotes use this structure instead of tool default. */
export async function getPricingStructureIdFromConfig(toolId?: string): Promise<string | null> {
  const row = await getConfigRow(toolId);
  const id = row?.pricing_structure_id;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

export async function setPricingStructureIdInConfig(structureId: string | null, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { pricing_structure_id: structureId });
}

/** Load a pricing structure's table by id (from pricing_structures table). Returns null if not found or not configured. */
export async function getPricingStructureTable(structureId: string): Promise<Record<string, unknown> | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from('pricing_structures')
    .select('pricing_table')
    .eq('id', structureId)
    .maybeSingle();
  const p = (data as { pricing_table?: unknown } | null)?.pricing_table;
  return p && typeof p === 'object' ? (p as Record<string, unknown>) : null;
}

/** Load a pricing structure's initial_cleaning_config. Returns null if not set (caller should fall back to tool config). */
export async function getInitialCleaningConfigForStructure(structureId: string): Promise<InitialCleaningConfig | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createSupabaseServer();
  const { data } = await supabase
    .from('pricing_structures')
    .select('initial_cleaning_config')
    .eq('id', structureId)
    .maybeSingle();
  const s = (data as { initial_cleaning_config?: unknown } | null)?.initial_cleaning_config;
  return s && typeof s === 'object' ? (s as InitialCleaningConfig) : null;
}

// ---- Service area ----
export async function getServiceAreaPolygonFromConfig(toolId?: string): Promise<unknown | null> {
  const row = await getConfigRow(toolId);
  const p = row?.service_area_polygon;
  return p ?? null;
}

export async function setServiceAreaPolygonInConfig(polygon: unknown | null, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { service_area_polygon: polygon as unknown as Json | null });
}

export async function getServiceAreaNetworkLinkFromConfig(toolId?: string): Promise<string | null> {
  const row = await getConfigRow(toolId);
  const u = row?.service_area_network_link;
  return typeof u === 'string' ? u : null;
}

export async function setServiceAreaNetworkLinkInConfig(url: string | null, toolId?: string): Promise<void> {
  await upsertConfig(toolId, { service_area_network_link: url });
}

/** Copy global config row (tool_id = null) to a new row for the given tool. Used by to-multitenant migration. */
export async function copyGlobalConfigToTool(toolId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = await getConfigRow(undefined);
  if (!row) return;
  const supabase = createSupabaseServer();
  const updated_at = new Date().toISOString();
  const payload = {
    tool_id: toolId,
    widget_settings: row.widget_settings,
    form_settings: row.form_settings,
    tracking_codes: row.tracking_codes,
    initial_cleaning_config: row.initial_cleaning_config,
    google_maps_key: row.google_maps_key,
    service_area_type: row.service_area_type,
    service_area_polygon: row.service_area_polygon,
    service_area_network_link: row.service_area_network_link,
    survey_questions: row.survey_questions,
    pricing_table: row.pricing_table,
    pricing_network_path: row.pricing_network_path,
    pricing_file_base64: row.pricing_file_base64,
    pricing_file_metadata: row.pricing_file_metadata,
    ghl_token: row.ghl_token,
    ghl_location_id: row.ghl_location_id,
    ghl_config: row.ghl_config,
    updated_at,
  };
  // @ts-expect-error Supabase generated types
  const { error } = await supabase.from('tool_config').upsert(payload, { onConflict: 'tool_id' });
  if (error) {
    console.error('tool_config copyGlobalConfigToTool:', error);
    throw error;
  }
}

/** Copy one tool's config to another tool. Used by clone. */
export async function copyToolConfig(sourceToolId: string, targetToolId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const row = await getConfigRow(sourceToolId);
  if (!row) return;
  const supabase = createSupabaseServer();
  const updated_at = new Date().toISOString();
  const payload = {
    tool_id: targetToolId,
    widget_settings: row.widget_settings,
    form_settings: row.form_settings,
    tracking_codes: row.tracking_codes,
    initial_cleaning_config: row.initial_cleaning_config,
    google_maps_key: row.google_maps_key,
    service_area_type: row.service_area_type,
    service_area_polygon: row.service_area_polygon,
    service_area_network_link: row.service_area_network_link,
    survey_questions: row.survey_questions,
    pricing_table: row.pricing_table,
    pricing_network_path: row.pricing_network_path,
    pricing_file_base64: row.pricing_file_base64,
    pricing_file_metadata: row.pricing_file_metadata,
    ghl_token: row.ghl_token,
    ghl_location_id: row.ghl_location_id,
    ghl_config: row.ghl_config,
    updated_at,
  };
  // @ts-expect-error Supabase generated types
  const { error } = await supabase.from('tool_config').upsert(payload, { onConflict: 'tool_id' });
  if (error) {
    console.error('tool_config copyToolConfig:', error);
    throw error;
  }
}
