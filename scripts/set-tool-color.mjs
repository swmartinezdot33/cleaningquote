#!/usr/bin/env node
/**
 * Set primary color for a tool by slug (for local testing).
 * Usage: node scripts/set-tool-color.mjs [slug] [hexColor]
 * Example: node scripts/set-tool-color.mjs rcc-copy "#00aa00"
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env.local');
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

const slug = process.argv[2] || 'rcc-copy';
const hexColor = process.argv[3] || '#00aa00';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: tool, error: toolErr } = await supabase.from('tools').select('id').eq('slug', slug).single();
  if (toolErr || !tool) {
    console.error('Tool not found for slug:', slug, toolErr?.message);
    process.exit(1);
  }

  const { data: row } = await supabase.from('tool_config').select('widget_settings').eq('tool_id', tool.id).maybeSingle();
  const current = (row?.widget_settings && typeof row.widget_settings === 'object') ? row.widget_settings : {};
  const next = {
    ...current,
    title: current.title ?? 'Get Your Quote',
    subtitle: current.subtitle ?? '',
    primaryColor: hexColor,
  };

  const { error: upErr } = await supabase
    .from('tool_config')
    .upsert({ tool_id: tool.id, widget_settings: next, updated_at: new Date().toISOString() }, { onConflict: 'tool_id' });

  if (upErr) {
    console.error('Update failed:', upErr.message);
    process.exit(1);
  }

  console.log('Updated tool', slug, 'primary color to', hexColor);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
