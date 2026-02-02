#!/usr/bin/env node
/**
 * Backfill contact data from GHL for quotes that have ghl_contact_id but null contact fields.
 *
 * Run: node scripts/backfill-from-ghl.mjs
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

  // Get GHL token from RCC tool config
  const { data: tool } = await supabase
    .from('tools')
    .select('id')
    .eq('slug', 'rcc')
    .single();

  if (!tool) {
    console.error('RCC tool not found');
    process.exit(1);
  }

  const { data: config } = await supabase
    .from('tool_config')
    .select('ghl_token')
    .eq('tool_id', tool.id)
    .single();

  const GHL_API_TOKEN = config?.ghl_token;

  if (!GHL_API_TOKEN) {
    console.error('GHL_API_TOKEN not found in tool config for RCC tool');
    process.exit(1);
  }

  // Find quotes with null contact data but non-null ghl_contact_id
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, quote_id, ghl_contact_id, first_name, last_name, email')
    .is('first_name', null)
    .not('ghl_contact_id', 'is', null);

  if (error) {
    console.error('Failed to fetch quotes:', error.message);
    process.exit(1);
  }

  console.log(`Found ${quotes?.length || 0} quotes to backfill from GHL.`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const quote of quotes || []) {
    try {
      // Fetch contact from GHL
      const response = await fetch(`https://services.leadconnectorhq.com/contacts/${quote.ghl_contact_id}`, {
        headers: {
          'Authorization': `Bearer ${GHL_API_TOKEN}`,
          'Version': '2021-07-28',
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch GHL contact ${quote.ghl_contact_id} for quote ${quote.quote_id}: ${response.status}`);
        failed++;
        continue;
      }

      const data = await response.json();
      const contact = data.contact || data;

      if (!contact) {
        console.error(`No contact data in GHL response for ${quote.quote_id}`);
        failed++;
        continue;
      }

      const updates = {};
      if (contact.firstName) updates.first_name = contact.firstName;
      if (contact.lastName) updates.last_name = contact.lastName;
      if (contact.email) updates.email = contact.email;
      if (contact.phone) updates.phone = contact.phone;
      if (contact.address1) updates.address = contact.address1;
      if (contact.city) updates.city = contact.city;
      if (contact.state) updates.state = contact.state;
      if (contact.postalCode) updates.postal_code = contact.postalCode;

      if (Object.keys(updates).length === 0) {
        console.log(`No contact data in GHL for ${quote.quote_id}`);
        skipped++;
        continue;
      }

      const { error: updateErr } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', quote.id);

      if (updateErr) {
        console.error(`Failed to update quote ${quote.quote_id}:`, updateErr.message);
        failed++;
      } else {
        console.log(`✓ ${quote.quote_id}: ${contact.firstName || ''} ${contact.lastName || ''} (${contact.email || ''})`);
        updated++;
      }

      // Rate limit: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (err) {
      console.error(`Error processing quote ${quote.quote_id}:`, err.message);
      failed++;
    }
  }

  console.log(`\nDone. Updated ${updated} quote(s), failed ${failed}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
