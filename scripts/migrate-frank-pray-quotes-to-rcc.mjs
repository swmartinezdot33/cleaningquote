#!/usr/bin/env node
/**
 * Migrate Frank Pray quotes to Raleigh Cleaning Company org.
 *
 * 1. Reassigns quotes in Supabase: finds quotes whose tool belongs to a
 *    "Frank Pray" or "demo" org (by org name/slug), and sets their tool_id
 *    to a tool in the Raleigh Cleaning Company org.
 * 2. Optional (--kv): Scans KV for keys quote:*, and for each payload where
 *    the quote is not already in Supabase, inserts a row with tool_id = RCC tool.
 *
 * Prerequisites:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   - For --kv: KV_REST_API_URL, KV_REST_API_TOKEN
 *
 * Run:
 *   node scripts/migrate-frank-pray-quotes-to-rcc.mjs
 *   node scripts/migrate-frank-pray-quotes-to-rcc.mjs --kv
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Org name/slug patterns for "Frank Pray" / demo (source)
const SOURCE_ORG_PATTERNS = ['frank', 'pray', 'demo'];
// Target: Raleigh Cleaning Company
const TARGET_ORG_PATTERNS = ['raleigh cleaning', 'raleighcleaningcompany', 'rcc'];

function orgMatches(org, patterns) {
  const name = (org.name || '').toLowerCase();
  const slug = (org.slug || '').toLowerCase();
  return patterns.some((p) => name.includes(p) || slug.includes(p));
}

async function main() {
  const useKv = process.argv.includes('--kv');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Resolve Raleigh Cleaning Company org and a target tool
  const { data: allOrgs, error: orgsErr } = await supabase
    .from('organizations')
    .select('id, name, slug');
  if (orgsErr || !allOrgs?.length) {
    console.error('Failed to list orgs:', orgsErr?.message || 'no data');
    process.exit(1);
  }

  const rccOrg = allOrgs.find((o) => orgMatches(o, TARGET_ORG_PATTERNS));
  if (!rccOrg) {
    console.error('Raleigh Cleaning Company org not found. Available:', allOrgs.map((o) => `${o.slug} (${o.name})`).join(', '));
    process.exit(1);
  }

  const { data: rccTools, error: toolsErr } = await supabase
    .from('tools')
    .select('id, name, slug')
    .eq('org_id', rccOrg.id)
    .limit(1);
  if (toolsErr || !rccTools?.length) {
    console.error('No tool found for RCC org.');
    process.exit(1);
  }
  const targetToolId = rccTools[0].id;
  console.log('Target org: RCC', rccOrg.name, `(${rccOrg.slug}), tool: ${rccTools[0].name} (${targetToolId})`);

  // Source: orgs that match Frank Pray / demo
  const sourceOrgIds = allOrgs
    .filter((o) => orgMatches(o, SOURCE_ORG_PATTERNS))
    .map((o) => o.id);
  if (!sourceOrgIds.length) {
    console.log('No Frank Pray / demo org found. Will only run KV migration if --kv.');
  } else {
    console.log('Source orgs (Frank Pray / demo):', allOrgs.filter((o) => sourceOrgIds.includes(o.id)).map((o) => o.name).join(', '));
  }

  let reassigned = 0;
  if (sourceOrgIds.length > 0) {
    const { data: sourceTools, error: stErr } = await supabase
      .from('tools')
      .select('id')
      .in('org_id', sourceOrgIds);
    if (!stErr && sourceTools?.length) {
      const sourceToolIds = sourceTools.map((t) => t.id);
      const { data: quotes, error: qErr } = await supabase
        .from('quotes')
        .select('id, quote_id, first_name, last_name, email, created_at')
        .in('tool_id', sourceToolIds);
      if (!qErr && quotes?.length) {
        console.log(`Found ${quotes.length} quote(s) in Frank Pray / demo org(s). Reassigning to RCC...`);
        for (const q of quotes) {
          const { error: upErr } = await supabase
            .from('quotes')
            .update({ tool_id: targetToolId })
            .eq('id', q.id);
          if (upErr) {
            console.error('Failed to update quote', q.quote_id, ':', upErr.message);
          } else {
            console.log('  Reassigned', q.quote_id, `(${q.first_name || ''} ${q.last_name || ''})`);
            reassigned++;
          }
        }
      } else if (qErr) {
        console.error('Failed to list quotes:', qErr.message);
      } else {
        console.log('No quotes found in Frank Pray / demo org(s).');
      }
    }
  }

  if (useKv && process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const { kv } = await import('@vercel/kv');
    const quoteKeys = [];
    for await (const key of kv.scanIterator({ match: 'quote:*', count: 100 })) {
      quoteKeys.push(key);
    }

    console.log(`KV: found ${quoteKeys.length} quote key(s). Checking for missing in Supabase...`);
    let inserted = 0;
    for (const key of quoteKeys) {
      const quoteId = key.replace(/^quote:/, '');
      if (!quoteId) continue;
      const raw = await kv.get(key);
      const payload = raw && (typeof raw === 'string' ? JSON.parse(raw) : raw);
      if (!payload || !payload.generatedQuoteId) continue;
      const existing = await supabase
        .from('quotes')
        .select('id')
        .eq('quote_id', payload.generatedQuoteId)
        .maybeSingle();
      if (existing.data) continue;
      const inputs = payload.inputs || {};
      const { error: insErr } = await supabase.from('quotes').insert({
        quote_id: payload.generatedQuoteId,
        tool_id: targetToolId,
        first_name: inputs.firstName ?? payload.firstName ?? null,
        last_name: inputs.lastName ?? payload.lastName ?? null,
        email: inputs.email ?? payload.email ?? null,
        phone: inputs.phone ?? payload.phone ?? null,
        address: inputs.address ?? payload.address ?? null,
        city: inputs.city ?? payload.city ?? null,
        state: inputs.state ?? payload.state ?? null,
        postal_code: inputs.postalCode ?? payload.postalCode ?? null,
        country: inputs.country ?? payload.country ?? null,
        service_type: payload.serviceType ?? null,
        frequency: payload.frequency ?? null,
        price_low: payload.ranges?.selected?.low ?? null,
        price_high: payload.ranges?.selected?.high ?? null,
        square_feet: inputs.squareFeet != null ? String(inputs.squareFeet) : null,
        bedrooms: inputs.bedrooms ?? null,
        full_baths: inputs.fullBaths ?? null,
        half_baths: inputs.halfBaths ?? null,
        summary_text: payload.summaryText ?? null,
        payload: payload,
        ghl_contact_id: payload.ghlContactId ?? null,
        ghl_object_id: payload.ghlQuoteCreated ? payload.generatedQuoteId : null,
      });
      if (insErr) {
        if (insErr.code === '23505') {
          // unique violation - already exists
          continue;
        }
        console.error('Failed to insert from KV', payload.generatedQuoteId, ':', insErr.message);
      } else {
        console.log('  Inserted from KV:', payload.generatedQuoteId);
        inserted++;
      }
    }
    console.log('KV migration: inserted', inserted, 'quote(s).');
  } else if (useKv) {
    console.log('Skipping KV migration: set KV_REST_API_URL and KV_REST_API_TOKEN for --kv.');
  }

  console.log('Done. Reassigned', reassigned, 'quote(s) to Raleigh Cleaning Company org.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
