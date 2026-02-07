# CleanQuote Getting Started Guide

Quick path from sign-up to your first embedded quote widget.

---

## 1. Sign up

- Go to [CleanQuote](https://www.cleanquote.io) (or your production URL).
- Click **Get started** / **Subscribe** and complete checkout (Stripe).
- You’ll receive an email to **set your password** (from CleanQuote or your Resend address).

---

## 2. Set your password

- Open the email and click **Set password** (or the link in the email).
- Choose a strong password and confirm.
- You’ll be signed in and redirected to your **Dashboard**.

---

## 3. Your first quoting tool

- In the Dashboard you’ll see your **organization** and a default **tool** (or “Quote form”).
- **To create another tool:** use **Add tool** (or equivalent) and give it a name and slug (e.g. `my-cleaning-quote`).
- **Configure the tool:**
  - **Pricing:** Create pricing structures under **Dashboard → Pricing**; assign one to this tool in **Tool → Settings → Pricing Structure**.
  - **Form / survey:** Adjust questions and fields if needed.
  - **CRM (optional):** Connect your CRM in **Settings → HighLevel Integration** (one per org); then set pipelines, calendars, tags, and webhooks per tool in **Tool Settings → Advanced Configuration**.
  - **Service area (optional):** Add areas under **Dashboard → Service areas** (ZIP code or draw/upload KML); assign to the tool in **Tool Settings → Service Area(s)**.

Your quote form URL will look like:

`https://www.cleanquote.io/t/{your-org-slug}/{tool-slug}`

Example: `https://www.cleanquote.io/t/acme-cleaning/default`

---

## 4. Embed the widget on your site

**Option A – iframe (simplest)**

Add this to your website where you want the quote form:

```html
<iframe
  src="https://www.cleanquote.io/t/{your-org-slug}/{tool-slug}"
  title="Get Your Quote"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; max-width: 600px;"
></iframe>
```

Replace `{your-org-slug}` and `{tool-slug}` with your actual org and tool slugs (see the Dashboard or the form URL).

**Option B – direct link**

Link a button or text to the form URL:

`https://www.cleanquote.io/t/{your-org-slug}/{tool-slug}`

**Optional:** Add UTM parameters for tracking, e.g.  
`.../default?utm_source=website&utm_medium=homepage`

---

## 5. Test the flow

1. Open your embed or form URL in an incognito/private window.
2. Fill out the form and submit a quote.
3. Confirm you receive the quote (and, if GHL is connected, that the contact/opportunity appears in GHL).

---

## Support

**Need help?**  
**[How support is contacted – add your details here]**

Examples you can drop in:

- **Email:** support@cleanquote.io  
- **Help center:** https://help.cleanquote.io  
- **In-app:** Use the “Help” or “Contact” link in the dashboard footer  

---

*Last updated: February 2026*
