#!/usr/bin/env node
/**
 * Create a user and copy the default quoting tool (and its KV data) to that user.
 * Loads .env.local; requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, KV_*.
 *
 * Usage: node scripts/create-user-and-copy-tool.mjs
 * Or:    EMAIL=derek@raleighcleaningcompany.com PASSWORD='Password123!' node scripts/create-user-and-copy-tool.mjs
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

const EMAIL = process.env.EMAIL || 'derek@raleighcleaningcompany.com';
const PASSWORD = process.env.PASSWORD || 'Password123!';
const SOURCE_SLUG = process.env.SOURCE_SLUG || 'default';
const NEW_SLUG = process.env.NEW_SLUG || 'default-derek';
const NEW_TOOL_NAME = process.env.NEW_TOOL_NAME || 'Default quoting tool';

const KEYS_TO_COPY = [
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

  let userId;
  const { data: listUsers } = await supabase.auth.admin.listUsers();
  const found = listUsers?.users?.find((u) => u.email === EMAIL);
  if (found) {
    userId = found.id;
    console.log('User already exists:', EMAIL, 'id:', userId);
  } else {
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (createError) {
      console.error('Failed to create user:', createError.message);
      process.exit(1);
    }
    userId = userData.user.id;
    console.log('Created user:', EMAIL, 'id:', userId);
  }

  const { data: sourceTool, error: sourceError } = await supabase
    .from('tools')
    .select('id, name, slug')
    .eq('slug', SOURCE_SLUG)
    .single();

  if (sourceError || !sourceTool) {
    console.error('Source tool (slug: %s) not found:', SOURCE_SLUG, sourceError?.message || 'no data');
    process.exit(1);
  }

  const sourceToolId = sourceTool.id;
  console.log('Source tool:', sourceTool.name, 'id:', sourceToolId);

  const { data: existingSlug } = await supabase
    .from('tools')
    .select('id')
    .eq('slug', NEW_SLUG)
    .maybeSingle();

  if (existingSlug) {
    console.error('A tool with slug "%s" already exists. Set NEW_SLUG to something else.', NEW_SLUG);
    process.exit(1);
  }

  const { data: newTool, error: insertError } = await supabase
    .from('tools')
    .insert({
      user_id: userId,
      name: NEW_TOOL_NAME,
      slug: NEW_SLUG,
    })
    .select('id')
    .single();

  if (insertError || !newTool) {
    console.error('Failed to create tool:', insertError?.message);
    process.exit(1);
  }

  const newToolId = newTool.id;
  console.log('Created tool:', NEW_TOOL_NAME, 'slug:', NEW_SLUG, 'id:', newToolId);

  let copied = 0;
  for (const k of KEYS_TO_COPY) {
    try {
      const value = await kv.get(toolKey(sourceToolId, k));
      if (value !== null && value !== undefined) {
        await kv.set(toolKey(newToolId, k), value);
        copied++;
        console.log('Copied KV:', k);
      }
    } catch (e) {
      console.warn('Skip', k, e.message);
    }
  }
  try {
    const meta = await kv.get(toolKey(sourceToolId, METADATA_SUFFIX));
    if (meta !== null && meta !== undefined) {
      await kv.set(toolKey(newToolId, METADATA_SUFFIX), meta);
      copied++;
      console.log('Copied KV:', METADATA_SUFFIX);
    }
  } catch (e) {
    console.warn('Skip metadata', e.message);
  }

  console.log('Done. User:', EMAIL, 'password:', PASSWORD);
  console.log('New tool: slug=%s id=%s (KV keys copied: %d)', NEW_SLUG, newToolId, copied);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
