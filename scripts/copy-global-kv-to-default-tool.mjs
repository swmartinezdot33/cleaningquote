#!/usr/bin/env node
/**
 * Copy global KV keys into the default tool (slug: default).
 * Use when the default tool exists but tool-scoped KV is empty or stale.
 * Loads .env.local; requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KV_*.
 *
 * Run: node scripts/copy-global-kv-to-default-tool.mjs
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

const GLOBAL_KEYS_TO_COPY = [
  'pricing:file:2026',
  'pricing:network:path',
  'pricing:data:table',
  'ghl:api:token',
  'ghl:location:id',
  'ghl:config',
  'widget:settings',
  'survey:questions',
  'survey:questions:v2',
  'service:area:polygon',
  'service:area:network:link',
  'admin:form-settings',
  'admin:initial-cleaning-config',
  'admin:tracking-codes',
  'admin:google-maps-api-key',
];
const METADATA_SUFFIX = 'pricing:file:2026:metadata';

function toolKey(toolId, key) {
  return `tool:${toolId}:${key}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('Missing KV_REST_API_URL or KV_REST_API_TOKEN');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data: tool, error } = await supabase
    .from('tools')
    .select('id, slug')
    .eq('slug', 'default')
    .single();

  if (error || !tool) {
    console.error('Default tool (slug: default) not found:', error?.message || 'no data');
    process.exit(1);
  }

  const toolId = tool.id;
  console.log('Copying global KV → tool:', toolId, 'slug:', tool.slug);

  let copied = 0;
  for (const k of GLOBAL_KEYS_TO_COPY) {
    try {
      const value = await kv.get(k);
      if (value !== null && value !== undefined) {
        await kv.set(toolKey(toolId, k), value);
        copied++;
        console.log('Copied:', k);
      }
    } catch (e) {
      console.warn('Skip', k, e.message);
    }
  }
  try {
    const meta = await kv.get(METADATA_SUFFIX);
    if (meta !== null && meta !== undefined) {
      await kv.set(toolKey(toolId, METADATA_SUFFIX), meta);
      copied++;
      console.log('Copied:', METADATA_SUFFIX);
    }
  } catch (e) {
    console.warn('Skip metadata', e.message);
  }

  console.log('Done. Copied', copied, 'keys to default tool.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
