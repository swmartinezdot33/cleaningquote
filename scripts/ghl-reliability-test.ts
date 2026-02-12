#!/usr/bin/env npx tsx
/**
 * GHL reliability test: hit dashboard endpoints (contacts, pipelines, opportunities, quotes)
 * repeatedly and report success/failure. Use for validating the central client and GHL API.
 *
 * Usage:
 *   GHL_LOCATION_ID=xxx GHL_ACCESS_TOKEN=xxx npx tsx scripts/ghl-reliability-test.ts
 *   GHL_RELIABILITY_RUNS=10 npx tsx scripts/ghl-reliability-test.ts  # default 50
 *
 * Do not commit tokens. Use a location token (from OAuth) for the given location.
 */

const RUNS = Math.max(1, parseInt(process.env.GHL_RELIABILITY_RUNS ?? '50', 10));
const locationId = process.env.GHL_LOCATION_ID?.trim();
const token = process.env.GHL_ACCESS_TOKEN?.trim();

async function main() {
  if (!locationId || !token) {
    console.error('Set GHL_LOCATION_ID and GHL_ACCESS_TOKEN (location-scoped token).');
    process.exit(1);
  }

  const credentials = { token, locationId };

  // Dynamic import to avoid loading Next.js when script is run standalone
  const { getContacts } = await import('../src/lib/ghl/ghl-client');
  const { getPipelines } = await import('../src/lib/ghl/ghl-client');
  const { getOpportunities } = await import('../src/lib/ghl/ghl-client');
  const { getQuoteRecords } = await import('../src/lib/ghl/ghl-client');

  const results: Record<string, { ok: number; fail: number; lastError?: string }> = {
    contacts: { ok: 0, fail: 0 },
    pipelines: { ok: 0, fail: 0 },
    opportunities: { ok: 0, fail: 0 },
    quotes: { ok: 0, fail: 0 },
  };

  const runOne = async (
    key: keyof typeof results,
    fn: () => Promise<{ ok: boolean; error?: { message: string } }>
  ) => {
    const r = results[key];
    const out = await fn();
    if (out.ok) r.ok++;
    else {
      r.fail++;
      r.lastError = out.error?.message;
    }
  };

  console.log(`Running each endpoint ${RUNS} times (location: ${locationId.slice(0, 8)}...)\n`);

  for (let i = 0; i < RUNS; i++) {
    await runOne('contacts', async () => {
      const res = await getContacts(locationId, credentials, { limit: 1 });
      return res.ok ? { ok: true } : { ok: false, error: res.error };
    });
    await runOne('pipelines', async () => {
      const res = await getPipelines(locationId, credentials);
      return res.ok ? { ok: true } : { ok: false, error: res.error };
    });
    await runOne('opportunities', async () => {
      const res = await getOpportunities(locationId, credentials, { limit: 1 });
      return res.ok ? { ok: true } : { ok: false, error: res.error };
    });
    await runOne('quotes', async () => {
      const res = await getQuoteRecords(locationId, credentials, { limit: 1 });
      return res.ok ? { ok: true } : { ok: false, error: res.error };
    });
  }

  const lines: string[] = [];
  let failed = false;
  for (const [name, r] of Object.entries(results)) {
    const total = r.ok + r.fail;
    const pct = total ? ((r.ok / total) * 100).toFixed(1) : '0';
    lines.push(`${name}: ${r.ok}/${total} (${pct}%)${r.lastError ? ` — last error: ${r.lastError.slice(0, 80)}` : ''}`);
    if (r.fail > 0 && (r.ok + r.fail) > 0 && r.ok / (r.ok + r.fail) < 0.99) failed = true;
  }
  console.log(lines.join('\n'));

  if (failed) {
    console.error('\nAt least one endpoint had < 99% success.');
    process.exit(1);
  }
  console.log('\nAll endpoints passed (≥ 99% success).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
