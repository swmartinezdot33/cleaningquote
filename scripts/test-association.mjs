#!/usr/bin/env node
/**
 * Test GET, PUT, GET for /api/admin/test-association.
 * Loads ADMIN_PASSWORD from .env or .env.local. Requires dev server on localhost:3000.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^ADMIN_PASSWORD=(.*)$/);
      if (m) {
        const v = m[1].replace(/^["']|["']$/g, '').trim();
        if (v) return v;
      }
    }
  }
  return process.env.ADMIN_PASSWORD || '';
}

const BASE = 'http://localhost:3000';
const admin = loadEnv();

if (!admin) {
  console.error('Missing ADMIN_PASSWORD in .env, .env.local, or ADMIN_PASSWORD env.');
  process.exit(1);
}

const headers = { 'x-admin-password': admin, 'Content-Type': 'application/json' };

async function get() {
  const r = await fetch(`${BASE}/api/admin/test-association`, { headers });
  return { status: r.status, body: await r.json() };
}

async function put() {
  const r = await fetch(`${BASE}/api/admin/test-association`, { method: 'PUT', headers });
  return { status: r.status, body: await r.json() };
}

async function post(quoteRecordId, contactId) {
  const r = await fetch(`${BASE}/api/admin/test-association`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ quoteRecordId, contactId }),
  });
  return { status: r.status, body: await r.json() };
}

async function main() {
  console.log('=== 1. GET (list associations, find Contact-Quote) ===');
  let g = await get();
  console.log('Status:', g.status);
  console.log(JSON.stringify(g.body, null, 2));

  if (g.status === 401) {
    console.error('Unauthorized. Check ADMIN_PASSWORD.');
    process.exit(1);
  }
  if (g.status >= 500 || (g.body && g.body.error && !g.body.associationsWorking)) {
    console.error('GET failed or GHL not configured.');
  }

  console.log('\n=== 2. PUT (create Contact-Quote association definition) ===');
  let p = await put();
  console.log('Status:', p.status);
  console.log(JSON.stringify(p.body, null, 2));

  if (p.status === 200 || p.status === 201) {
    console.log('\n✅ Association definition created.');
  } else if (p.body && (p.body.lastError || p.body.error)) {
    console.log('\n⚠️ Create failed. lastError/error above.');
  }

  console.log('\n=== 3. GET (verify Contact-Quote exists) ===');
  g = await get();
  console.log('Status:', g.status);
  console.log(JSON.stringify(g.body, null, 2));

  const found = g.body && g.body.contactQuoteFound === true;
  const aid = g.body && g.body.contactQuoteAssociationId;

  if (found && aid) {
    console.log('\n✅ contactQuoteFound: true, contactQuoteAssociationId:', aid);
  } else {
    console.log('\n⚠️ Contact-Quote association not found. Create in GHL UI or fix PUT body.');
  }

  const [qr, cid] = process.argv.slice(2);
  if (qr && cid) {
    console.log('\n=== 4. POST (create relation quote<->contact) ===');
    p = await post(qr, cid);
    console.log('Status:', p.status);
    console.log(JSON.stringify(p.body, null, 2));
    if (p.status === 200) console.log('\n✅ Relation created.');
    else if (p.body?.attempts?.[0]?.payload?.associationId && /Invalid record id/i.test(String(p.body?.attempts?.[0]?.error || '')))
      console.log('\n✅ Relation API OK (associationId found). Failure due to invalid quote/contact IDs; use real GHL IDs.');
  } else {
    console.log('\n(Skip POST: run with quoteRecordId and contactId to test relation, e.g. node scripts/test-association.mjs <quoteId> <contactId>)');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
