# CleanQuote.io Script

Single script for CleanQuote integrations (e.g. **GoHighLevel**). Load it with one script tag; it currently adds a "Get Quote" button that opens your CleanQuote survey with the current contact's data pre-filled. More features can be added to this script over time.

## 1. Host the script on your site

- The file to host: **`cleanquote.js`** (in this folder; when deployed it’s under `/scripts/cleanquote.js`).
- Upload it to your site or CDN so it’s available at a URL like:
  - `https://yourdomain.com/scripts/cleanquote.js`

(If you deploy this Next.js app, the file is served at both `/scripts/cleanquote.js` and **`/api/script/cleanquote.js`**. Use the API URL in GHL so the script loads with CORS and works from external sites.)

## 2. In GHL, add one script tag

Where GHL lets you add custom code (e.g. **Custom Code**, **Tracking Code**, **Scripts**, or the contact detail page/funnel script section), add only:

**Important:** In GHL you must use the **API URL** below (the one with `/api/script/`). The static URL (`/scripts/cleanquote.js`) does not send CORS headers and will be blocked by the browser when loaded from app.gohighlevel.com.

```html
<script src="https://www.cleanquote.io/api/script/cleanquote.js?v=2"
  data-base-url="https://www.cleanquote.io"
  crossorigin="anonymous"></script>
```

Replace `https://www.cleanquote.io` with your CleanQuote domain. Use `?v=2` (bump to `?v=3` when you update the script for cache-busting).

**If the script doesn’t load:**
1. Check that the `src` is exactly `.../api/script/cleanquote.js` (not `.../scripts/cleanquote.js`). The `/api/script/` path is required for CORS from GHL.
2. If it still fails with CORS, try **removing** `crossorigin="anonymous"` from the script tag. Some setups load the script without that attribute.
3. **data-base-url** is optional when the script is loaded from your CleanQuote domain: the script will use the same origin as the script URL (e.g. https://www.cleanquote.io) as the survey base URL.

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

- **data-base-url** (optional) – Your CleanQuote base URL. If omitted and the script is loaded from your CleanQuote domain (e.g. www.cleanquote.io), the script uses that origin automatically.
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
