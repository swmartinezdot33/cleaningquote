# E2E: Appointment from UI

Playwright test for the **book appointment** flow: quote page → Book an Appointment → pick date → pick time → Confirm → appointment-confirmed.

## Prerequisites

- **TEST_QUOTE_ID**: A real quote ID (e.g. `QT-260125-XXXXX`) from your app.
  - Create a quote via the main form at `/`, then copy the Quote ID from the result page.

- GHL and app config (for a full pass):
  - GHL token, Location ID, appointment calendar, and assigned user in Admin Settings.
  - Calendar with availability in the requested month.

## Run

```bash
# With Playwright starting the dev server (default)
TEST_QUOTE_ID=QT-260125-XXXXX npm run test:e2e:appointment

# Or
TEST_QUOTE_ID=QT-260125-XXXXX npx playwright test e2e/appointment-from-ui.spec.ts
```

## Optional env

- **PLAYWRIGHT_BASE_URL**: e.g. `https://quote.yoursite.com` to run against production.
- **PLAYWRIGHT_REUSE_SERVER=1**: Use an already running dev server (start `npm run dev` first).

## If the test fails

- **"Quote … not found or invalid"**  
  Use a quote ID from a quote you just created on the same app (and env) you’re testing.

- **"Book an Appointment" not found**  
  The quote page didn’t load (e.g. 404 or different layout). Check `test-results/` screenshots and `PLAYWRIGHT_BASE_URL`.

- **No available dates / times**  
  In GHL: assign users to the appointment calendar and set availability.

- **"We encountered an issue creating your appointment"**  
  Check GHL (token, Location ID, calendar, user) and app logs for the `/api/appointments/create` 500.
