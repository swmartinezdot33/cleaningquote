#!/usr/bin/env node
/**
 * Verify that every tool in Supabase has a tool_config row with at least some config.
 * Run after migrations to catch tools missing config (e.g. rcc showing defaults).
 *
 * Requires: .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: node scripts/verify-tool-config.mjs
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

function hasConfig(row) {
  if (!row) return false;
  return !!(
    (row.widget_settings && typeof row.widget_settings === 'object') ||
    (row.form_settings && typeof row.form_settings === 'object') ||
    (row.tracking_codes && typeof row.tracking_codes === 'object') ||
    (row.initial_cleaning_config && typeof row.initial_cleaning_config === 'object') ||
    (row.google_maps_key && typeof row.google_maps_key === 'string') ||
    (row.ghl_token && typeof row.ghl_token === 'string') ||
    (row.ghl_location_id && typeof row.ghl_location_id === 'string') ||
    (row.ghl_config && typeof row.ghl_config === 'object') ||
    (row.survey_questions && Array.isArray(row.survey_questions) && row.survey_questions.length > 0) ||
    (row.pricing_table && typeof row.pricing_table === 'object') ||
    (row.pricing_file_base64 && typeof row.pricing_file_base64 === 'string') ||
    (row.service_area_polygon && Array.isArray(row.service_area_polygon)) ||
    (row.service_area_network_link && typeof row.service_area_network_link === 'string')
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: tools, error: toolsErr } = await supabase.from('tools').select('id, slug, name').order('slug');
  if (toolsErr) {
    console.error('Failed to fetch tools:', toolsErr.message);
    process.exit(1);
  }
  if (!tools?.length) {
    console.log('No tools in database.');
    process.exit(0);
  }

  const { data: toolConfigRows, error: configErr } = await supabase
    .from('tool_config')
    .select('tool_id, widget_settings, form_settings, survey_questions, ghl_token, ghl_config, pricing_table, service_area_polygon')
    .not('tool_id', 'is', null);
  if (configErr) {
    console.error('Failed to fetch tool_config:', configErr.message);
    process.exit(1);
  }

  const configByToolId = new Map((toolConfigRows ?? []).map((r) => [r.tool_id, r]));

  const { data: globalRows } = await supabase.from('tool_config').select('id').is('tool_id', null);
  const hasGlobal = (globalRows?.length ?? 0) > 0;

  let missing = 0;
  let empty = 0;
  let ok = 0;

  console.log('Tool config verification\n');
  console.log('Slug         | Config row | Has data | Status');
  console.log('-------------|------------|----------|--------');

  for (const tool of tools) {
    const row = configByToolId.get(tool.id);
    const hasRow = !!row;
    const hasData = hasConfig(row);
    let status = 'OK';
    if (!hasRow) {
      missing++;
      status = 'MISSING ROW';
    } else if (!hasData) {
      empty++;
      status = 'EMPTY';
    } else {
      ok++;
    }
    const slugPad = (tool.slug || '').slice(0, 12).padEnd(12);
    const rowStr = hasRow ? 'yes' : 'no';
    const dataStr = hasData ? 'yes' : 'no';
    console.log(`${slugPad} | ${rowStr.padEnd(10)} | ${dataStr.padEnd(8)} | ${status}`);
  }

  console.log('');
  console.log('Summary:');
  console.log(`  Tools with config:     ${ok}`);
  console.log(`  Tools with empty row:  ${empty}`);
  console.log(`  Tools missing row:     ${missing}`);
  console.log(`  Global config row:     ${hasGlobal ? 'yes' : 'no'}`);
  console.log('');

  if (missing > 0 || empty > 0) {
    console.log('Fix: run migration for missing/empty tools:');
    if (missing > 0 || empty > 0) {
      console.log('  MIGRATE_ALL_TOOLS=1 node scripts/migrate-kv-config-to-supabase.mjs');
      console.log('Or for a single tool:');
      console.log('  MIGRATE_TOOL_SLUG=<slug> node scripts/migrate-kv-config-to-supabase.mjs');
    }
    process.exit(1);
  }

  console.log('All tools have config. OK.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
