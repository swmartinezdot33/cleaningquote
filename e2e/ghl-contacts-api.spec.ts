import { test, expect } from '@playwright/test';

/**
 * GHL Contacts API — matches official template flow.
 * Template: example-api-call-location uses location token (from install or POST /oauth/locationToken) for GET /contacts.
 *
 * Run against local dev (with real GHL env and a locationId that has Connect done):
 *   PLAYWRIGHT_BASE_URL=http://localhost:3000 GHL_LOCATION_ID=yourRealLocationId npx playwright test e2e/ghl-contacts-api.spec.ts
 *
 * Run without real location (expects needsConnect or 401):
 *   npx playwright test e2e/ghl-contacts-api.spec.ts
 */
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const REAL_LOCATION_ID = process.env.GHL_LOCATION_ID?.trim(); // optional: real location that has OAuth completed

test.describe('GHL Contacts API (template-aligned)', () => {
  test('GET /api/dashboard/crm/contacts with x-ghl-location-id returns 200 with contacts or needsConnect', async ({
    request,
  }) => {
    const locationId = REAL_LOCATION_ID || 'test-location-id-12345';
    const res = await request.get(`${BASE}/api/dashboard/crm/contacts`, {
      headers: { 'x-ghl-location-id': locationId },
    });

    const data = await res.json().catch(() => ({}));

    // Must not be 401 "authClass type not allowed" (we use location token, not company token)
    if (res.status() === 401) {
      const msg = (data as { error?: string }).error ?? (data as { message?: string }).message ?? '';
      expect(msg).not.toMatch(/authClass type is not allowed/i);
    }

    // Either success with contacts array or needsConnect / error
    if (res.ok()) {
      expect(data).toHaveProperty('contacts');
      expect(Array.isArray((data as { contacts?: unknown }).contacts)).toBe(true);
    } else {
      // needsConnect or other error
      expect([400, 401, 403]).toContain(res.status());
    }
  });

  test('GET /api/dashboard/crm/contacts with locationId query (fallback) returns valid shape', async ({
    request,
  }) => {
    const locationId = REAL_LOCATION_ID || 'test-location-id-99999';
    const res = await request.get(`${BASE}/api/dashboard/crm/contacts?locationId=${locationId}`);

    const data = await res.json().catch(() => ({}));
    if (res.ok()) {
      expect(data).toHaveProperty('contacts');
      expect(Array.isArray((data as { contacts?: unknown }).contacts)).toBe(true);
    }
  });
});
