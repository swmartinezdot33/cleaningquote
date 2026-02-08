import { test, expect } from '@playwright/test';

/**
 * E2E: Dashboard connection / GHL context
 * Verifies the CRM "Connect your location" flow and that we show user context + KV proof.
 *
 * Run (dev server on 3002):
 *   PLAYWRIGHT_BASE_URL=http://localhost:3002 npx playwright test e2e/dashboard-connection.spec.ts
 *
 * Or let Playwright start the server (default 3000):
 *   npx playwright test e2e/dashboard-connection.spec.ts
 */
test.describe('Dashboard connection', () => {
  test('dashboard with locationId: either CRM/Connect UI or Open from GHL (no session)', async ({
    page,
  }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    await page.goto(`${baseURL}/dashboard?locationId=test-location-id-12345`, {
      waitUntil: 'domcontentloaded',
    });

    // No session in e2e: middleware redirects to "Open from GoHighLevel". With session we'd see CRM.
    await expect(
      page.getByRole('heading', { name: /Open from GoHighLevel|CRM Pipeline/i })
    ).toBeVisible({ timeout: 10_000 });

    // If we did land on CRM (e.g. with session cookie), User context line and Test connection should exist
    const hasCRM = await page.getByText('CRM Pipeline').isVisible();
    if (hasCRM) {
      await expect(page.getByText(/User context: Location ID =/)).toBeVisible();
      await expect(page.getByRole('button', { name: /Test connection/i })).toBeVisible();
    }
  });

  test('verify API returns tokenExistsInKV and locationIdLookedUp when called with locationId', async ({
    request,
  }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const res = await request.get(
      `${baseURL}/api/dashboard/ghl/verify?locationId=test-location-id-12345`
    );
    const data = await res.json();
    expect(data).toHaveProperty('tokenExistsInKV');
    expect(data).toHaveProperty('locationIdLookedUp');
    expect(typeof data.tokenExistsInKV).toBe('boolean');
    // User context / locationId lookup: we looked up this id in KV
    expect(data.locationIdLookedUp).toBe('test-loc..2345');
  });

  test('kv-check API returns exists and locationId for connection proof', async ({ request }) => {
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
    const res = await request.get(
      `${baseURL}/api/dashboard/ghl/kv-check?locationId=test-location-id-12345`
    );
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data).toMatchObject({
      tokenExistsInKV: expect.any(Boolean),
      locationIdLookedUp: 'test-loc..2345',
      hasAccessToken: expect.any(Boolean),
      hasRefreshToken: expect.any(Boolean),
    });
  });
});
