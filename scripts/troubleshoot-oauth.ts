/**
 * OAuth flow troubleshooting script
 * Run: npx playwright test e2e/troubleshoot-oauth.spec.ts --project=chromium
 * Or: npx ts-node --project tsconfig.json scripts/troubleshoot-oauth.ts (if ts-node available)
 *
 * Opens a headed browser so you can watch the OAuth flow and spot issues.
 */
import { chromium } from 'playwright';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://www.cleanquote.io';

async function main() {
  console.log('Launching Chrome (headed) for OAuth troubleshooting...\n');
  console.log('Base URL:', BASE_URL);
  console.log('---\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  // Log all console messages
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    if (type === 'error') {
      console.log('❌ CONSOLE ERROR:', text);
    } else if (type === 'warning') {
      console.log('⚠️ CONSOLE WARN:', text);
    }
  });

  // Log redirects and key requests
  page.on('request', (req) => {
    const url = req.url();
    if (
      url.includes('oauth') ||
      url.includes('chooselocation') ||
      url.includes('leadconnectorhq') ||
      url.includes('gohighlevel')
    ) {
      console.log('→ REQUEST:', req.method(), url);
    }
  });

  page.on('response', async (res) => {
    const url = res.url();
    const status = res.status();
    if (
      url.includes('oauth') ||
      url.includes('callback') ||
      url.includes('chooselocation')
    ) {
      console.log('← RESPONSE:', status, url);
      if (status >= 400) {
        try {
          const body = await res.text();
          console.log('   Body:', body.slice(0, 300));
        } catch {}
      }
    }
  });

  try {
    // Step 1: Go to /app (Launch URL)
    console.log('\n📍 Step 1: Navigating to /app (Launch URL)...');
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle', timeout: 15000 });
    console.log('   Current URL:', page.url());

    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    console.log('\n   Final URL after redirect:', currentUrl);

    if (currentUrl.includes('oauth-success')) {
      const error = await page.url().match(/error=([^&]+)/)?.[1];
      const errorDesc = await page.url().match(/error_description=([^&]+)/)?.[1];
      console.log('\n⚠️ Landed on oauth-success with params. Check URL for error/error_description');
      if (error) console.log('   error:', decodeURIComponent(error));
      if (errorDesc) console.log('   error_description:', decodeURIComponent(errorDesc));
    } else if (currentUrl.includes('marketplace.gohighlevel.com') || currentUrl.includes('chooselocation')) {
      console.log('\n✅ Reached GHL OAuth chooselocation page');
      console.log('   → Select a location and authorize. The page will redirect to the callback.');
      console.log('   → Keeping browser open. Complete OAuth manually, then press Enter here.');
      await new Promise<void>((resolve) => {
        process.stdin.once('data', () => resolve());
      });
    } else if (currentUrl.includes('/dashboard')) {
      console.log('\n✅ Already connected – redirected to dashboard');
    } else {
      console.log('\n❓ Unexpected destination. Inspect the page.');
    }
  } catch (err) {
    console.error('\n❌ Error:', err);
  }

  console.log('\nKeeping browser open for inspection. Close manually or press Enter to exit.');
  await new Promise<void>((resolve) => {
    process.stdin.once('data', () => resolve());
  });
  await browser.close();
}

main();
