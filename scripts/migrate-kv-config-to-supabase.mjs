#!/usr/bin/env node
/**
 * One-off: migrate existing config from Vercel KV to Supabase tool_config (global row, tool_id = null).
 * Run once after deploying the KV→Supabase config migration.
 *
 * The Vercel CLI can provide KV access: run `vercel env pull` first to pull env vars (including
 * KV_REST_API_URL, KV_REST_API_TOKEN) from Vercel into .env.local, then run this script.
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and KV access
 * (KV_REST_API_URL, KV_REST_API_TOKEN — from Vercel project or via `vercel env pull`).
 *
 * Run:
 *   vercel env pull        # optional: get KV (and other) env from Vercel
 *   node scripts/migrate-kv-config-to-supabase.mjs
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
  pricing_network_path: 'pricing:network:path',
  service_area_polygon: 'service:area:polygon',
  service_area_network_link: 'service:area:network:link',
};

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

  console.log('Reading config from KV (global keys)...');

  const widget_settings = await kv.get(KV_KEYS.widget_settings);
  const form_settings = await kv.get(KV_KEYS.form_settings);
  const tracking_codes = await kv.get(KV_KEYS.tracking_codes);
  const initial_cleaning_config = await kv.get(KV_KEYS.initial_cleaning_config);
  const google_maps_key = await kv.get(KV_KEYS.google_maps_key);
  const ghl_token = await kv.get(KV_KEYS.ghl_token);
  const ghl_location_id = await kv.get(KV_KEYS.ghl_location_id);
  const ghl_config = await kv.get(KV_KEYS.ghl_config);
  let survey_questions = await kv.get(KV_KEYS.survey_questions);
  if (!survey_questions || !Array.isArray(survey_questions)) {
    survey_questions = await kv.get(KV_KEYS.survey_questions_legacy);
  }
  const pricing_table = await kv.get(KV_KEYS.pricing_table);
  const pricing_file_raw = await kv.get(KV_KEYS.pricing_file_base64);
  const pricing_file_base64 = typeof pricing_file_raw === 'string' ? pricing_file_raw : null;
  const pricing_network_path = await kv.get(KV_KEYS.pricing_network_path);
  const service_area_polygon = await kv.get(KV_KEYS.service_area_polygon);
  const service_area_network_link = await kv.get(KV_KEYS.service_area_network_link);

  const hasAny =
    widget_settings != null ||
    form_settings != null ||
    tracking_codes != null ||
    initial_cleaning_config != null ||
    google_maps_key != null ||
    ghl_token != null ||
    ghl_location_id != null ||
    ghl_config != null ||
    (survey_questions != null && survey_questions.length > 0) ||
    pricing_table != null ||
    pricing_file_base64 != null ||
    pricing_network_path != null ||
    service_area_polygon != null ||
    service_area_network_link != null;

  if (!hasAny) {
    console.log('No config found in KV (global keys). Nothing to migrate.');
    process.exit(0);
  }

  const updated_at = new Date().toISOString();
  const row = {
    tool_id: null,
    widget_settings: widget_settings ?? null,
    form_settings: form_settings ?? null,
    tracking_codes: tracking_codes ?? null,
    initial_cleaning_config: initial_cleaning_config ?? null,
    google_maps_key: google_maps_key ?? null,
    service_area_type: 'none',
    service_area_polygon: service_area_polygon ?? null,
    service_area_network_link: service_area_network_link ?? null,
    survey_questions: survey_questions && Array.isArray(survey_questions) ? survey_questions : null,
    pricing_table: pricing_table ?? null,
    pricing_network_path: pricing_network_path ?? null,
    pricing_file_base64: pricing_file_base64 ?? null,
    ghl_token: ghl_token ?? null,
    ghl_location_id: ghl_location_id ?? null,
    ghl_config: ghl_config ?? null,
    updated_at,
  };

  const { data: existing } = await supabase
    .from('tool_config')
    .select('id')
    .is('tool_id', null)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from('tool_config').update(row).eq('id', existing.id);
    if (error) {
      console.error('Update tool_config failed:', error);
      process.exit(1);
    }
    console.log('Updated existing global config row in tool_config.');
  } else {
    const { error } = await supabase.from('tool_config').insert(row);
    if (error) {
      console.error('Insert tool_config failed:', error);
      process.exit(1);
    }
    console.log('Inserted new global config row in tool_config.');
  }

  const migrated = [
    widget_settings != null && 'widget_settings',
    form_settings != null && 'form_settings',
    tracking_codes != null && 'tracking_codes',
    initial_cleaning_config != null && 'initial_cleaning_config',
    google_maps_key != null && 'google_maps_key',
    ghl_token != null && 'ghl_token',
    ghl_location_id != null && 'ghl_location_id',
    ghl_config != null && 'ghl_config',
    survey_questions?.length > 0 && 'survey_questions',
    pricing_table != null && 'pricing_table',
    pricing_file_base64 != null && 'pricing_file_base64',
    pricing_network_path != null && 'pricing_network_path',
    service_area_polygon != null && 'service_area_polygon',
    service_area_network_link != null && 'service_area_network_link',
  ].filter(Boolean);
  console.log('Migrated keys:', migrated.join(', '));
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
