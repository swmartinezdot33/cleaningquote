#!/usr/bin/env node
/**
 * One-off: migrate existing config from Vercel KV to Supabase tool_config.
 * 1) Writes to the global row (tool_id = null).
 * 2) Copies config into tool row(s) so the dashboard sees it.
 *
 * Modes:
 * - MIGRATE_ALL_TOOLS=1 — migrate for every tool in Supabase (global KV + each tool's tool:${id}:* keys).
 * - Otherwise — migrate for one tool: MIGRATE_TOOL_SLUG (default: "default").
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and KV
 * (KV_REST_API_URL, KV_REST_API_TOKEN). Run `vercel env pull` to get KV_*.
 *
 * Run:
 *   node scripts/migrate-kv-config-to-supabase.mjs
 *   MIGRATE_TOOL_SLUG=rcc node scripts/migrate-kv-config-to-supabase.mjs
 *   MIGRATE_ALL_TOOLS=1 node scripts/migrate-kv-config-to-supabase.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1).replace(/\\n/g, '\n');
      if (!process.env[m[1]]) process.env[m[1]] = val;
    }
  }
}

import { createClient } from '@supabase/supabase-js';
import { kv } from '@vercel/kv';

const KV_KEYS = {
  widget_settings: 'widget:settings',
  form_settings: 'admin:form-settings',
  tracking_codes: 'admin:tracking-codes',
  initial_cleaning_config: 'admin:initial-cleaning-config',
  google_maps_key: 'admin:google-maps-api-key',
  ghl_token: 'ghl:api:token',
  ghl_location_id: 'ghl:location:id',
  ghl_config: 'ghl:config',
  survey_questions: 'survey:questions:v2',
  survey_questions_legacy: 'survey:questions',
  pricing_table: 'pricing:data:table',
  pricing_file_base64: 'pricing:file:2026',
  pricing_file_metadata: 'pricing:file:2026:metadata',
  pricing_network_path: 'pricing:network:path',
  service_area_polygon: 'service:area:polygon',
  service_area_network_link: 'service:area:network:link',
};

/** Read config from KV: use toolPrefix keys first (tool:${id}:key), then global keys. */
async function getConfigFromKv(toolPrefix) {
  async function getKv(name) {
    const globalKey = KV_KEYS[name];
    if (toolPrefix) {
      const v = await kv.get(toolPrefix + globalKey);
      if (v !== null && v !== undefined) return v;
    }
    return kv.get(globalKey);
  }
  const widget_settings = await getKv('widget_settings');
  const form_settings = await getKv('form_settings');
  const tracking_codes = await getKv('tracking_codes');
  const initial_cleaning_config = await getKv('initial_cleaning_config');
  const google_maps_key = await getKv('google_maps_key');
  const ghl_token = await getKv('ghl_token');
  const ghl_location_id = await getKv('ghl_location_id');
  const ghl_config = await getKv('ghl_config');
  let survey_questions = await getKv('survey_questions');
  if (!survey_questions || !Array.isArray(survey_questions)) {
    survey_questions =
      (toolPrefix ? await kv.get(toolPrefix + KV_KEYS.survey_questions_legacy) : null) ??
      (await kv.get(KV_KEYS.survey_questions_legacy));
  }
  const pricing_table = await getKv('pricing_table');
  const pricing_file_raw = await getKv('pricing_file_base64');
  const pricing_file_base64 = typeof pricing_file_raw === 'string' ? pricing_file_raw : null;
  const pricing_file_metadata = await getKv('pricing_file_metadata');
  const pricing_network_path = await getKv('pricing_network_path');
  const service_area_polygon = await getKv('service_area_polygon');
  const service_area_network_link = await getKv('service_area_network_link');
  const pricing_file_metadata_val =
    pricing_file_metadata != null && typeof pricing_file_metadata === 'object' ? pricing_file_metadata : null;
  return {
    widget_settings: widget_settings ?? null,
    form_settings: form_settings ?? null,
    tracking_codes: tracking_codes ?? null,
    initial_cleaning_config: initial_cleaning_config ?? null,
    google_maps_key: google_maps_key ?? null,
    ghl_token: ghl_token ?? null,
    ghl_location_id: ghl_location_id ?? null,
    ghl_config: ghl_config ?? null,
    survey_questions: survey_questions && Array.isArray(survey_questions) ? survey_questions : null,
    pricing_table: pricing_table ?? null,
    pricing_file_base64: pricing_file_base64 ?? null,
    pricing_file_metadata: pricing_file_metadata_val,
    pricing_network_path: pricing_network_path ?? null,
    service_area_polygon: service_area_polygon ?? null,
    service_area_network_link: service_area_network_link ?? null,
  };
}

function hasAnyConfig(c) {
  return (
    c.widget_settings != null ||
    c.form_settings != null ||
    c.tracking_codes != null ||
    c.initial_cleaning_config != null ||
    c.google_maps_key != null ||
    c.ghl_token != null ||
    c.ghl_location_id != null ||
    c.ghl_config != null ||
    (c.survey_questions != null && c.survey_questions.length > 0) ||
    c.pricing_table != null ||
    c.pricing_file_base64 != null ||
    c.pricing_file_metadata != null ||
    c.pricing_network_path != null ||
    c.service_area_polygon != null ||
    c.service_area_network_link != null
  );
}

function buildRow(config, toolId, updated_at) {
  return {
    ...(toolId !== undefined && toolId !== null ? { tool_id: toolId } : { tool_id: null }),
    widget_settings: config.widget_settings,
    form_settings: config.form_settings,
    tracking_codes: config.tracking_codes,
    initial_cleaning_config: config.initial_cleaning_config,
    google_maps_key: config.google_maps_key,
    service_area_type: 'none',
    service_area_polygon: config.service_area_polygon,
    service_area_network_link: config.service_area_network_link,
    survey_questions: config.survey_questions,
    pricing_table: config.pricing_table,
    pricing_network_path: config.pricing_network_path,
    pricing_file_base64: config.pricing_file_base64,
    pricing_file_metadata: config.pricing_file_metadata,
    ghl_token: config.ghl_token,
    ghl_location_id: config.ghl_location_id,
    ghl_config: config.ghl_config,
    updated_at,
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('Missing KV_REST_API_URL or KV_REST_API_TOKEN.');
    console.error('Pull env from Vercel (includes KV):  vercel env pull');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const migrateAll = process.env.MIGRATE_ALL_TOOLS === '1' || process.env.MIGRATE_ALL_TOOLS === 'true';
  const updated_at = new Date().toISOString();

  // 1) Global config from KV
  console.log('Reading config from KV (global keys)...');
  const globalConfig = await getConfigFromKv(null);
  if (!hasAnyConfig(globalConfig) && !migrateAll) {
    console.log('No config found in KV (global keys). Nothing to migrate.');
    process.exit(0);
  }

  // 2) Write global row if we have any config (from global or we'll use it as fallback for tools)
  if (hasAnyConfig(globalConfig)) {
    const globalRow = buildRow(globalConfig, null, updated_at);
    const { data: existing } = await supabase
      .from('tool_config')
      .select('id')
      .is('tool_id', null)
      .maybeSingle();
    if (existing?.id) {
      const { error } = await supabase.from('tool_config').update(globalRow).eq('id', existing.id);
      if (error) {
        console.error('Update tool_config (global) failed:', error);
        process.exit(1);
      }
      console.log('Updated global config row in tool_config.');
    } else {
      const { error } = await supabase.from('tool_config').insert(globalRow);
      if (error) {
        console.error('Insert tool_config (global) failed:', error);
        process.exit(1);
      }
      console.log('Inserted global config row in tool_config.');
    }
  }

  if (migrateAll) {
    const { data: tools, error: toolsErr } = await supabase.from('tools').select('id, slug, name');
    if (toolsErr || !tools?.length) {
      console.log('No tools in Supabase, or error:', toolsErr?.message || 'none');
      console.log('Done.');
      process.exit(0);
    }
    console.log('Migrating config for %d tool(s)...', tools.length);
    let migrated = 0;
    for (const tool of tools) {
      const toolPrefix = `tool:${tool.id}:`;
      const config = await getConfigFromKv(toolPrefix);
      if (!hasAnyConfig(config)) {
        Object.assign(config, globalConfig);
      }
      if (!hasAnyConfig(config)) {
        console.log('  %s (%s) — no KV config, skip', tool.slug, tool.id);
        continue;
      }
      const toolRow = buildRow(config, tool.id, updated_at);
      const { error: upsertErr } = await supabase.from('tool_config').upsert(toolRow, { onConflict: 'tool_id' });
      if (upsertErr) {
        console.error('Upsert tool_config for tool "%s" (%s) failed:', tool.slug, tool.id, upsertErr);
        process.exit(1);
      }
      migrated++;
      console.log('  %s (%s)', tool.slug, tool.id);
    }
    console.log('Migrated config to %d tool(s). Done.', migrated);
    process.exit(0);
  }

  // Single-tool mode: copy global config into one tool by slug
  const toolSlug = process.env.MIGRATE_TOOL_SLUG || 'default';
  const { data: toolForKv } = await supabase.from('tools').select('id, slug').eq('slug', toolSlug).maybeSingle();
  if (!toolForKv) {
    console.log('No tool with slug "%s" found; skipping tool row.', toolSlug);
    console.log('Done.');
    process.exit(0);
  }
  const toolPrefix = `tool:${toolForKv.id}:`;
  const singleConfig = await getConfigFromKv(toolPrefix);
  if (!hasAnyConfig(singleConfig)) {
    singleConfig.widget_settings = globalConfig.widget_settings;
    singleConfig.form_settings = globalConfig.form_settings;
    singleConfig.tracking_codes = globalConfig.tracking_codes;
    singleConfig.initial_cleaning_config = globalConfig.initial_cleaning_config;
    singleConfig.google_maps_key = globalConfig.google_maps_key;
    singleConfig.ghl_token = globalConfig.ghl_token;
    singleConfig.ghl_location_id = globalConfig.ghl_location_id;
    singleConfig.ghl_config = globalConfig.ghl_config;
    singleConfig.survey_questions = globalConfig.survey_questions;
    singleConfig.pricing_table = globalConfig.pricing_table;
    singleConfig.pricing_file_base64 = globalConfig.pricing_file_base64;
    singleConfig.pricing_file_metadata = globalConfig.pricing_file_metadata;
    singleConfig.pricing_network_path = globalConfig.pricing_network_path;
    singleConfig.service_area_polygon = globalConfig.service_area_polygon;
    singleConfig.service_area_network_link = globalConfig.service_area_network_link;
  }
  const toolRow = buildRow(singleConfig, toolForKv.id, updated_at);
  const { error: upsertErr } = await supabase.from('tool_config').upsert(toolRow, { onConflict: 'tool_id' });
  if (upsertErr) {
    console.error('Upsert tool_config for tool "%s" failed:', toolSlug, upsertErr);
    process.exit(1);
  }
  console.log('Copied config to tool slug "%s" (id: %s). Done.', toolSlug, toolForKv.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
