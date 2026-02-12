#!/usr/bin/env node
/**
 * One-off: read the Agency token from KV (stored when a Company user completed Connect)
 * and print the env vars you can copy into .env.local for GHL_AGENCY_ACCESS_TOKEN and GHL_COMPANY_ID.
 *
 * Use this for the create-location flow (e.g. Stripe webhook) without committing secrets.
 *
 * Requires: .env.local with KV_REST_API_URL and KV_REST_API_TOKEN (or run with env set).
 *
 * Run:
 *   node scripts/print-agency-token-for-env.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { kv } from '@vercel/kv';

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

const KV_KEY = 'ghl:agency:token';

async function main() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.error('KV_REST_API_URL and KV_REST_API_TOKEN are required. Add them to .env.local or set in the environment.');
    process.exit(1);
  }

  const data = await kv.get(KV_KEY);
  if (!data?.accessToken || !data?.companyId) {
    console.error('No agency token in KV at', KV_KEY);
    console.error('Have an Agency (Company) user complete Connect from the app; their OAuth token is stored there.');
    process.exit(1);
  }

  console.log('# Copy these lines into .env.local (do NOT commit). Optional: used for create-location flow (e.g. Stripe).\n');
  console.log('GHL_AGENCY_ACCESS_TOKEN=' + data.accessToken);
  console.log('GHL_COMPANY_ID=' + data.companyId);
  console.log('\n# Optional: Agency token for POST /oauth/locationToken and creating sub-accounts.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
