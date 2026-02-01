#!/usr/bin/env node
/**
 * Delete the Frank Pray quote from the demo account.
 *
 * Prerequisites:
 * - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local or env
 * - DEMO_ORG_SLUG (optional): org slug for demo account. If unset, finds org where name or slug contains "demo".
 *
 * Run: node scripts/delete-frank-pray-quote.mjs
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
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1).replace(/\\n/g, '\n');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_ORG_SLUG = process.env.DEMO_ORG_SLUG;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let demoOrgId = null;
  if (DEMO_ORG_SLUG) {
    const { data: org } = await supabase.from('organizations').select('id, name, slug').eq('slug', DEMO_ORG_SLUG.trim()).single();
    if (org) {
      demoOrgId = org.id;
      console.log('Using demo org:', org.name, `(${org.slug})`);
    } else {
      console.error('Demo org not found for slug:', DEMO_ORG_SLUG);
      process.exit(1);
    }
  } else {
    const { data: orgs } = await supabase.from('organizations').select('id, name, slug');
    const demo = (orgs ?? []).find((o) =>
      (o.name && o.name.toLowerCase().includes('demo')) || (o.slug && o.slug.toLowerCase().includes('demo'))
    );
    if (demo) {
      demoOrgId = demo.id;
      console.log('Auto-detected demo org:', demo.name, `(${demo.slug})`);
    } else if (orgs?.length === 1) {
      demoOrgId = orgs[0].id;
      console.log('Using only org:', orgs[0].name, `(${orgs[0].slug})`);
    } else {
      console.error('Could not identify demo org. Set DEMO_ORG_SLUG or ensure an org has "demo" in name/slug.');
      if (orgs?.length) {
        console.log('Available orgs:', orgs.map((o) => `${o.slug} (${o.name})`).join(', '));
      }
      process.exit(1);
    }
  }

  const { data: tools } = await supabase.from('tools').select('id').eq('org_id', demoOrgId);
  const toolIds = (tools ?? []).map((t) => t.id);
  if (toolIds.length === 0) {
    console.log('No tools found for demo org.');
    process.exit(0);
  }

  const { data: allQuotes, error: listErr } = await supabase
    .from('quotes')
    .select('id, quote_id, first_name, last_name, email, created_at')
    .in('tool_id', toolIds);

  if (listErr) {
    console.error('Failed to list quotes:', listErr.message);
    process.exit(1);
  }

  const quotes = (allQuotes ?? []).filter((q) => {
    const fn = (q.first_name || '').toLowerCase();
    const ln = (q.last_name || '').toLowerCase();
    return (fn.includes('frank') && ln.includes('pray')) || (fn.includes('pray') && ln.includes('frank'));
  });

  if (!quotes.length) {
    console.log('No Frank Pray quote found in demo account.');
    process.exit(0);
  }

  for (const q of quotes) {
    const { error: delErr } = await supabase.from('quotes').delete().eq('id', q.id);
    if (delErr) {
      console.error('Failed to delete quote', q.quote_id, ':', delErr.message);
    } else {
      console.log('Deleted quote', q.quote_id, `(${q.first_name} ${q.last_name})`);
    }
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
