# Stripe webhook: no account created

If a customer completed checkout but no Supabase user/org was created, check the following.

## First steps (Vercel logs)

1. **Vercel → Project → Logs** (filter by time around the checkout).
2. Look for **`Stripe webhook: received event checkout.session.completed`**.
   - **If you don’t see it:** Stripe isn’t hitting your app. Fix webhook URL and/or signing secret (see sections 1–2).
   - **If you see it:** Then look for **`Stripe webhook: creating user and org`**.
3. If you see **`creating user and org`** but then **`ensureUserAndOrgFromStripe returned null`**: the failure is in Supabase (create user or org). Check `SUPABASE_SERVICE_ROLE_KEY` in Vercel Production and Supabase Auth/DB. You may also see **`createUser failed`** or **`org insert failed`** with details.
4. If you see **`checkout.session.completed — no subscription ID`** and **`Rely on customer.subscription.created`**: the handler is waiting for the `customer.subscription.created` event (common with trials). Ensure that event is selected on your webhook endpoint and check logs for **`Stripe webhook: received event customer.subscription.created`**.

## 1. Stripe Dashboard → Webhooks

- Open [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks).
- Select the endpoint that points to your app (e.g. `https://your-domain.com/api/webhooks/stripe`).
- **Events to listen for:** Ensure these are selected:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- **Recent deliveries:** Check whether `checkout.session.completed` and `customer.subscription.created` show **Succeeded** or **Failed**.
  - If **Failed**, open the request and check the response body (e.g. "Supabase not configured", "No email in session", "Failed to create user/org").
  - If the webhook was never sent, the endpoint URL may be wrong or the event not selected.

## 2. Test vs Live mode

- Use the **same** mode everywhere: if you tested checkout in **Test mode**, the webhook secret must be the **test** secret (`whsec_...` from the test endpoint).
- In Vercel (or your host), set:
  - `STRIPE_SECRET_KEY` (test or live, matching your checkout)
  - `STRIPE_WEBHOOK_SECRET` (or `STRIPE_WEBHOOK_SECRET_ALT`) for the **same** mode and the exact endpoint URL.

## 3. Payment link must be a subscription

- If you use **payment link** (no `STRIPE_PRICE_ID`), the link in Stripe must be for a **subscription** product, not one-time payment.
- One-time payments do not create a subscription, so we never create an org/user (by design).

## 4. Vercel (or host) logs

- After a test checkout, open your host’s logs for the **production** (or preview) environment.
- Filter by the webhook route (e.g. `/api/webhooks/stripe`) and look for lines starting with `Stripe webhook:`.
- You should see:
  - `Stripe webhook: received event checkout.session.completed evt_...`
  - `Stripe webhook: checkout.session.completed payload { mode, hasCustomerId, hasEmail, hasSubscriptionId }`
  - Either `Stripe webhook: account created from checkout.session.completed` or `customer.subscription.created`, or an error (e.g. `no email`, `createUser failed`, `org insert failed`).

Use these logs to see where the flow stopped (no subscription ID, no email, Supabase error, etc.).

## 5. Supabase env in production

- In Vercel (or your host), set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- If either is missing, the webhook returns 500 with "Supabase not configured".

## 6. User exists but has no org (no org name in header, profile not tied to subscription)

If the user was created and can sign in but sees no organization (no org switcher, billing not tied to subscription), the webhook created the user but the org or membership step failed or was never run.

**Fix in Super Admin:**

1. Sign in as a super admin and go to **Super Admin**.
2. In **Organizations**, find the org that matches the new signup (name or Stripe subscription).
3. In **Users**, find the user (e.g. the one with no org shown).
4. Use **Assign user to organization**: select that user, select that org, role **Admin**, then **Assign**.

The user can then sign in and will see the org in the header and billing tied to that org.

## 7. Manually create the account for the affected user

If the webhook will not create the account (e.g. event already sent and not retried):

1. In **Supabase Dashboard → Authentication → Users**, add a user with the customer’s **business email** and set a temporary password (or send magic link).
2. In **Table Editor → organizations**, create an org (name = business name, `stripe_customer_id` = Stripe customer ID, `stripe_subscription_id` = subscription ID, `subscription_status` = e.g. `active` or `trialing`).
3. In **Table Editor → organization_members**, add a row: `org_id` = new org, `user_id` = new user, `role` = `admin`.

Then the user can sign in and use the dashboard.
