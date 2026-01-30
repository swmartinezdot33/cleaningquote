#!/usr/bin/env node
/**
 * Migration script: Option B — migrate existing global KV config into the first user and first tool.
 *
 * Prerequisites:
 * - Set MIGRATION_USER_EMAIL and MIGRATION_USER_PASSWORD (and optionally MIGRATION_DEFAULT_SLUG, default: "default")
 * - Set RUN_MIGRATION=true to run even if tools already exist (otherwise exits when any tool exists)
 * - Supabase: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - Vercel KV: KV_REST_API_URL, KV_REST_API_TOKEN
 *
 * Run: node scripts/migrate-to-multitenant.mjs
 * Loads .env.local from project root if present.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local from project root (same directory as package.json)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1).replace(/\\n/g, '\n');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import { createClient } from '@supabase/supabase-js';
import { kv } from '@vercel/kv';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIGRATION_USER_EMAIL = process.env.MIGRATION_USER_EMAIL;
const MIGRATION_USER_PASSWORD = process.env.MIGRATION_USER_PASSWORD;
const MIGRATION_DEFAULT_SLUG = process.env.MIGRATION_DEFAULT_SLUG || 'default';
const RUN_MIGRATION = process.env.RUN_MIGRATION === 'true';

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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  if (!MIGRATION_USER_EMAIL || !MIGRATION_USER_PASSWORD) {
    console.error('Missing MIGRATION_USER_EMAIL or MIGRATION_USER_PASSWORD');
    process.exit(1);
  }
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('Missing KV_REST_API_URL or KV_REST_API_TOKEN');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: existingTools, error: listError } = await supabase.from('tools').select('id');
  if (listError) {
    console.error('Failed to list tools:', listError.message);
    process.exit(1);
  }
  if (existingTools.length > 0 && !RUN_MIGRATION) {
    console.log('Tools already exist. Set RUN_MIGRATION=true to re-copy KV into first tool. Exiting.');
    process.exit(0);
  }

  let userId;
  let toolId;

  if (existingTools.length > 0 && RUN_MIGRATION) {
    toolId = existingTools[0].id;
    const { data: toolRow } = await supabase.from('tools').select('user_id').eq('id', toolId).single();
    userId = toolRow?.user_id;
    console.log('RUN_MIGRATION: using existing first tool', toolId);
  } else {
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const found = existingUser?.users?.find((u) => u.email === MIGRATION_USER_EMAIL);
    if (found) {
      userId = found.id;
      console.log('Using existing user:', MIGRATION_USER_EMAIL);
    } else {
      const { data: userData, error: createError } = await supabase.auth.admin.createUser({
        email: MIGRATION_USER_EMAIL,
        password: MIGRATION_USER_PASSWORD,
        email_confirm: true,
      });
      if (createError) {
        console.error('Failed to create user:', createError.message);
        process.exit(1);
      }
      userId = userData.user.id;
      console.log('Created user:', MIGRATION_USER_EMAIL);
    }

    const slug = MIGRATION_DEFAULT_SLUG;
    const { data: toolData, error: toolError } = await supabase
      .from('tools')
      .insert({
        user_id: userId,
        name: 'Default quoting tool',
        slug,
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (toolError) {
      console.error('Failed to create tool:', toolError.message);
      process.exit(1);
    }
    toolId = toolData.id;
    console.log('Created tool:', toolId, 'slug:', slug);
  }

  let copied = 0;
  for (const key of GLOBAL_KEYS_TO_COPY) {
    try {
      const value = await kv.get(key);
      if (value !== null && value !== undefined) {
        await kv.set(toolKey(toolId, key), value);
        copied++;
        console.log('Copied:', key);
      }
    } catch (e) {
      console.warn('Skip or error copying', key, e.message);
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
    console.warn('Skip or error copying metadata', e.message);
  }

  console.log('Done. Copied', copied, 'keys to tool:', toolId);
  console.log('First user can sign in at /login with', MIGRATION_USER_EMAIL);
  console.log('Default tool survey URL: /t/' + MIGRATION_DEFAULT_SLUG);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
