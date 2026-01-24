import { test, expect } from '@playwright/test';

/**
 * E2E: Appointment creation from the UI
 *
 * Prerequisites:
 * - Dev server running (or webServer in playwright.config)
 * - GHL configured in admin (token, location, appointment calendar, user)
 * - TEST_QUOTE_ID: existing quote ID (e.g. QT-260124-XXXXX) that has ghlContactId
 *
 * Run:
 *   TEST_QUOTE_ID=QT-260124-XXXXX npx playwright test e2e/appointment-from-ui.spec.ts
 *
 * Or with dev server already running:
 *   PLAYWRIGHT_REUSE_SERVER=1 TEST_QUOTE_ID=QT-260124-XXXXX npx playwright test e2e/appointment-from-ui.spec.ts
 */
const QUOTE_ID = process.env.TEST_QUOTE_ID;

test.describe('Appointment from UI', () => {
  test.skip(
    !QUOTE_ID,
    'Set TEST_QUOTE_ID to an existing quote ID (e.g. QT-260124-XXXXX) to run this test'
  );

  test('book appointment from quote page: open calendar, pick date/time, confirm', async ({
    page,
  }) => {
    await page.goto(`/quote/${QUOTE_ID}`, { waitUntil: 'domcontentloaded' });
    // Allow time for client-side quote fetch
    await page.waitForTimeout(4_000);

    const is404 = await page.getByRole('heading', { name: '404' }).isVisible();
    const isQuoteNotFound = await page.getByRole('heading', { name: 'Quote Not Found' }).isVisible();
    if (is404 || isQuoteNotFound) {
      throw new Error(
        `Quote ${QUOTE_ID} not found or invalid. Create a quote from the form first, then set TEST_QUOTE_ID to that quote ID.`
      );
    }

    const bookBtn = page.getByRole('button', { name: /book an appointment/i });
    await expect(bookBtn).toBeVisible({ timeout: 5_000 });
    await bookBtn.click();

    // Calendar: wait for it to load (heading or loading text)
    await expect(page.getByRole('heading', { name: /select a date/i })).toBeVisible({ timeout: 10_000 });

    // Wait for "Loading available dates" to disappear and for at least one available day
    await page.waitForFunction(
      () => {
        const loading = document.body.textContent?.includes('Loading available dates');
        const buttons = document.querySelectorAll('button[class*="green"]');
        return !loading && buttons.length > 0;
      },
      { timeout: 20_000 }
    );

    const availableDay = page.locator('button[class*="bg-green-50"], button[class*="border-green"]').first();
    await expect(availableDay).toBeVisible({ timeout: 5000 });
    await availableDay.click();

    // Time: wait for slots and click first
    await expect(page.getByRole('heading', { name: /select a time/i })).toBeVisible({ timeout: 10_000 });

    await page.waitForFunction(
      () => {
        const loading = document.body.textContent?.includes('Loading available times');
        const slots = document.querySelectorAll('button');
        const withAmPm = [...slots].filter((b) => /\d{1,2}:\d{2}\s*(AM|PM)/i.test(b.textContent || ''));
        return !loading && withAmPm.length > 0;
      },
      { timeout: 15_000 }
    ).catch(() => null);

    const timeSlot = page.locator('button').filter({ hasText: /\d{1,2}:\d{2}\s*(AM|PM)/i }).first();
    await expect(timeSlot).toBeVisible({ timeout: 10_000 });
    await timeSlot.click();

    // Notes + Confirm: "Confirm Appointment" should appear
    const confirmBtn = page.getByRole('button', { name: /confirm appointment/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Success: either redirect to appointment-confirmed or no error message
    const errMsg = page.getByText(/we encountered an issue creating your appointment/i);
    const confirmed = page.url().includes('/appointment-confirmed');

    await Promise.race([
      page.waitForURL(/\/quote\/[^/]+\/appointment-confirmed/, { timeout: 25_000 }),
      errMsg.waitFor({ state: 'visible', timeout: 25_000 }).then(() => 'error'),
    ]).then((outcome) => {
      if (outcome === 'error') {
        const text = errMsg.textContent();
        throw new Error(`Appointment create failed: ${text || 'unknown'}`);
      }
    });

    expect(page.url()).toMatch(/\/appointment-confirmed/);
  });
});
