# CleanQuote.io Script

Single script for CleanQuote integrations (e.g. **GoHighLevel**). Load it with one script tag; it currently adds a "Get Quote" button that opens your CleanQuote survey with the current contact's data pre-filled. More features can be added to this script over time.

## 1. Host the script on your site

- The file to host: **`cleanquote.js`** (in this folder; when deployed it’s under `/scripts/cleanquote.js`).
- Upload it to your site or CDN so it’s available at a URL like:
  - `https://yourdomain.com/scripts/cleanquote.js`

(If you deploy this Next.js app, the file is served at both `/scripts/cleanquote.js` and **`/api/script/cleanquote.js`**. Use the API URL in GHL so the script loads with CORS and works from external sites.)

## 2. In GHL, add one script tag

Where GHL lets you add custom code (e.g. **Custom Code**, **Tracking Code**, **Scripts**, or the contact detail page/funnel script section), add only:

**Recommended (API URL – loads reliably from GHL):**

```html
<script src="https://www.cleanquote.io/api/script/cleanquote.js?v=2"
  data-base-url="https://www.cleanquote.io"
  crossorigin="anonymous"></script>
```

Replace `https://www.cleanquote.io` with your CleanQuote domain. Use `?v=2` (bump to `?v=3` when you update the script for cache-busting).

**Alternative (static file):** If you host the file elsewhere, use that URL instead, e.g. `https://yourdomain.com/scripts/cleanquote.js?v=2`.

### Optional: point to your CleanQuote tool and button text

Add data attributes on the script tag:

```html
<script src="https://www.cleanquote.io/api/script/cleanquote.js?v=2"
  data-base-url="https://www.cleanquote.io"
  data-tool-slug="default"
  data-org-slug=""
  data-button-text="Get Quote"
  data-container-selector="#cleanquote-container"
  crossorigin="anonymous"></script>
```

- **data-base-url** (required) – Your CleanQuote base URL (e.g. your custom domain or CleanQuote app URL).
- **data-tool-slug** – Tool slug for the survey. Default: `"default"`.
- **data-org-slug** – Org slug if you use org-scoped URLs (`/t/orgSlug/toolSlug`). Omit if not using.
- **data-button-text** – Button label. Default: `"Get Quote"`.
- **data-container-selector** – CSS selector where the button is inserted (e.g. `#cleanquote-container`). If omitted, a container is appended to the page body.

## Contact data

The button opens the survey with query parameters for the current contact (first name, last name, email, phone, address, contact ID, etc.) so the form can pre-fill.

The script looks for contact data in:

- `window.__CONTACT__`
- `window.contact`
- `window.ghlContact`
- Or DOM elements with `data-contact-id`, `data-contact-first-name`, etc.

If your GHL setup exposes the contact in another way, set `window.__CONTACT__` before this script runs, for example:

```js
window.__CONTACT__ = {
  id: "contact-id-here",
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "+15551234567",
  address1: "123 Main St",
  city: "Raleigh",
  state: "NC",
  postalCode: "27601"
};
```

Then load the CleanQuote script so it can read `window.__CONTACT__` and build the survey URL with pre-fill params.
