#!/usr/bin/env node
/**
 * Backfill contact data (first_name, last_name, email, etc.) from payload JSONB
 * for quotes where these columns are null but the data exists in the payload.
 *
 * Run: node scripts/backfill-quote-contact-data.mjs
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

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Find quotes with null contact data but non-null payload
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, quote_id, first_name, last_name, email, phone, address, city, state, postal_code, payload')
    .not('payload', 'is', null);

  if (error) {
    console.error('Failed to fetch quotes:', error.message);
    process.exit(1);
  }

  console.log(`Found ${quotes?.length || 0} quotes with payload data.`);

  let updated = 0;
  let skipped = 0;

  for (const quote of quotes || []) {
    const payload = quote.payload;
    if (!payload || typeof payload !== 'object') {
      skipped++;
      continue;
    }

    const inputs = payload.inputs || {};
    
    // Check if we need to update (at least one field is null but exists in payload)
    const updates = {};
    
    if (!quote.first_name && (inputs.firstName || payload.firstName)) {
      updates.first_name = inputs.firstName || payload.firstName;
    }
    if (!quote.last_name && (inputs.lastName || payload.lastName)) {
      updates.last_name = inputs.lastName || payload.lastName;
    }
    if (!quote.email && (inputs.email || payload.email)) {
      updates.email = inputs.email || payload.email;
    }
    if (!quote.phone && (inputs.phone || payload.phone)) {
      updates.phone = inputs.phone || payload.phone;
    }
    if (!quote.address && (inputs.address || payload.address)) {
      updates.address = inputs.address || payload.address;
    }
    if (!quote.city && (inputs.city || payload.city)) {
      updates.city = inputs.city || payload.city;
    }
    if (!quote.state && (inputs.state || payload.state)) {
      updates.state = inputs.state || payload.state;
    }
    if (!quote.postal_code && (inputs.postalCode || payload.postalCode)) {
      updates.postal_code = inputs.postalCode || payload.postalCode;
    }

    if (Object.keys(updates).length === 0) {
      skipped++;
      continue;
    }

    const { error: updateErr } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', quote.id);

    if (updateErr) {
      console.error(`Failed to update quote ${quote.quote_id}:`, updateErr.message);
    } else {
      console.log(`Updated ${quote.quote_id}: ${Object.keys(updates).join(', ')}`);
      updated++;
    }
  }

  console.log(`\nDone. Updated ${updated} quote(s), skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
