/**
 * OAuth flow troubleshooting
 * Run: npm run troubleshoot:oauth
 * Or: PLAYWRIGHT_BASE_URL=https://www.cleanquote.io npx playwright test e2e/troubleshoot-oauth.spec.ts --headed
 *
 * Opens Chrome – the window stays open at the GHL OAuth page. Complete the flow, then
 * click "Resume" in the Playwright Inspector window to finish.
 */
import { test } from '@playwright/test';

// Use localhost for local dev; set PLAYWRIGHT_BASE_URL for production
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('OAuth troubleshoot', () => {
  test('walk through /app → OAuth flow', async ({ page }, testInfo) => {
    testInfo.setTimeout(300000); // 5 min – window stays open via page.pause() until you click Resume

    const redirects: string[] = [];
    page.on('response', (res) => {
      const u = res.url();
      const req = res.request();
      if (req.redirectedFrom()) {
        redirects.push(`${req.redirectedFrom()?.url()} → ${u} [${res.status()}]`);
      }
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
    });

    page.on('request', (req) => {
      const u = req.url();
      if (u.includes('oauth') || u.includes('chooselocation') || u.includes('callback')) {
        console.log('→', req.method(), u.slice(0, 120) + (u.length > 120 ? '...' : ''));
      }
    });

    page.on('response', (res) => {
      const u = res.url();
      if (u.includes('oauth') || u.includes('callback') || u.includes('chooselocation')) {
        console.log('←', res.status(), u.slice(0, 100) + (u.length > 100 ? '...' : ''));
      }
    });

    console.log('\n=== Step 1: GET /app ===');
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('app') || r.url().includes('oauth') || r.url().includes('chooselocation'), { timeout: 15000 }).catch(() => null),
      page.goto(`${BASE}/app`, { waitUntil: 'domcontentloaded', timeout: 20000 }),
    ]);

    await page.waitForTimeout(2000);
    let url = page.url();
    console.log('Current URL:', url);

    // If we're still on /app, try direct oauth/authorize
    if (url.includes('/app') && !url.includes('oauth')) {
      console.log('\n=== Step 2: /app did not redirect. Trying /api/auth/oauth/authorize directly ===');
      await page.goto(`${BASE}/api/auth/oauth/authorize`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);
      url = page.url();
      console.log('Current URL:', url);
    }

    console.log('\n=== Result ===');
    if (url.includes('oauth-success')) {
      const parsed = new URL(url);
      const error = parsed.searchParams.get('error');
      const desc = parsed.searchParams.get('error_description');
      const success = parsed.searchParams.get('success');
      console.log('Landed on oauth-success');
      if (error) console.log('  error:', error, desc ? `– ${desc}` : '');
      if (success) console.log('  success:', success);
    } else if (url.includes('gohighlevel') || url.includes('chooselocation')) {
      console.log('Reached GHL OAuth – select location and authorize. Browser stays open until you press Resume.');
      await page.pause(); // Keeps window open – click Resume in Playwright Inspector when done
      url = page.url();
      console.log('After resume, URL:', url);
    } else if (url.includes('/dashboard')) {
      console.log('Connected – redirected to dashboard');
    } else {
      console.log('Unexpected URL. Inspect the page.');
    }

    if (redirects.length) {
      console.log('\nRedirect chain:', redirects.slice(-5).join('\n  '));
    }
  });
});
