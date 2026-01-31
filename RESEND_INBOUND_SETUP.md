# Resend Inbound Email Setup

Walkthrough for receiving emails via Resend and having them POSTed to your app.

---

## 1. Get a receiving address

**Option A – Resend domain (quick)**

1. Go to [Resend → Emails](https://resend.com/emails).
2. Open the **Receiving** tab.
3. Click the **⋮** menu → **Receiving address**.
4. Note your address: `anything@<your-id>.resend.app`.  
   Any email sent to `*@<your-id>.resend.app` will be received by Resend and sent to your webhook.

**Option B – Custom domain (e.g. `cleanquote.io`)**

1. In Resend go to **Domains** (or Receiving → Custom domains).
2. Add your domain (or subdomain like `mail.cleanquote.io`).
3. Resend will show **MX** records. Add those in your DNS (e.g. IONOS).
4. After verification, you receive mail at `*@your-domain.com` (or `*@mail.cleanquote.io`).

---

## 2. Add the webhook in Resend

1. Go to [Resend → Webhooks](https://resend.com/webhooks).
2. Click **Add Webhook**.
3. **Endpoint URL**:  
   Production: `https://www.cleanquote.io/api/webhooks/resend`  
   (Or your Vercel URL, e.g. `https://your-app.vercel.app/api/webhooks/resend`.)
4. **Event**: select **email.received**.
5. Click **Add**.
6. Copy the **Signing secret** (starts with `whsec_...`). You’ll use it in the next step.

---

## 3. Set the signing secret in your app

- **Local:** In `.env.local` add:
  ```bash
  RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
  ```
- **Vercel:**  
  Project → **Settings** → **Environment Variables** → add `RESEND_WEBHOOK_SECRET` with the same value for Production (and Preview if you want).

Redeploy so the new env var is used.

---

## 4. Confirm the endpoint

Your app already has the handler at **`/api/webhooks/resend`** (POST). It:

- Verifies the request using `RESEND_WEBHOOK_SECRET` when set.
- Handles `email.received` and returns `200` with `{ received: true, type: 'email.received', email_id: '...', body_fetched: true, text_preview: '...' }` when the body is fetched.
- If `RESEND_API_KEY` is set, automatically fetches the full email (html, text, headers, attachments, raw URL) via [Resend’s Retrieve Received Email API](https://resend.com/docs/api-reference/emails/retrieve-received-email); logs include hasHtml, hasText, attachmentCount.
- To use the content (e.g. store in DB, create ticket), add your logic in the handler where it says "Add your logic here"—you have access to `fullEmail.html`, `fullEmail.text`, `fullEmail.headers`, `fullEmail.attachments`, and `fullEmail.raw`.

No code change is required for basic receiving. To **use** the content (e.g. support ticket, reply), add your logic in `src/app/api/webhooks/resend/route.ts` where it says “Add your logic here.” The webhook payload does **not** include the body; it only has metadata (from, to, subject, attachments list). To get HTML/text body and attachments, call Resend’s [Receiving API](https://resend.com/docs/api-reference/emails/retrieve-received-email) with `email_id` and your `RESEND_API_KEY`.

---

## 5. Test receiving

1. Send an email to your receiving address (e.g. `support@<your-id>.resend.app` or `hello@mail.cleanquote.io`).
2. Resend will POST to your webhook. Check:
   - **Vercel:** Project → **Logs** (or **Functions** → your deployment).
   - **Resend:** Webhooks → your webhook → **Recent deliveries** (status and payload).

If the signing secret is wrong or missing, the route returns `400` and Resend may retry; fix the secret and redeploy.

---

## Optional: Use the full email in your logic

The handler already fetches the full email when `RESEND_API_KEY` is set. In `src/app/api/webhooks/resend/route.ts`, where it says "Add your logic here", use the `fullEmail` variable: `fullEmail.html`, `fullEmail.text`, `fullEmail.headers`, `fullEmail.attachments`, and `fullEmail.raw` (signed URL to download the original .eml file). Example: store in DB, create a support ticket, or forward to another address.
