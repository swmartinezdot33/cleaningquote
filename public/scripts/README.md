# CleanQuote.io – GHL Quoter Button Script

Two ways to open your survey with the current contact as query params so the form pre-fills.

---

## Option 1: Script – agency install (runs on all, button only on connected sub-accounts)

**GHL Agency → Settings → Company → Custom JS.** Add:

```html
<script src="https://www.cleanquote.io/api/script/cleanquote.js"></script>
```

No config needed. The script runs on every sub-account but **only injects the button on sub-accounts that have CleanQuote connected**. It auto-detects the current GHL location from the URL and fetches config; if that location isn't connected, no button appears.

Replace `www.cleanquote.io` with your CleanQuote domain. Connect GHL (token + Location ID) in the CleanQuote dashboard per tool first.

---

## Option 2: Link (no script)

Use a **link** in GHL that points to the redirect. No script, no CORS.

```
https://www.cleanquote.io/api/ghl?contactId={{contact.id}}&firstName={{contact.first_name}}&lastName={{contact.last_name}}&email={{contact.email}}&phone={{contact.phone}}&address={{contact.address1}}
```

Optional: `&city={{contact.city}}&state={{contact.state}}&postalCode={{contact.postal_code}}`  
For org-scoped survey: `&orgSlug=your-org&toolSlug=default`

---

## Option 3: Script (manual or single-location config)

**Single sub-account only:** Use `data-location-id` when the script is in one sub-account's Custom JS:
```html
<script src="https://www.cleanquote.io/api/script/cleanquote.js" data-location-id="YOUR_GHL_LOCATION_ID"></script>
```

**Explicit org/tool (no lookup):**

```html
<script src="https://www.cleanquote.io/api/script/cleanquote.js"
  data-base-url="https://www.cleanquote.io"
  data-org-slug="your-org"
  data-tool-slug="default"
  data-button-text="Get Quote"></script>
```

Optional: `data-container-selector`, `data-open-in-iframe="true"`. The script reads contact from `window.__CONTACT__`, `window.contact`, `window.ghlContact`, or DOM `data-contact-*`.

---

**If the script doesn't run in GHL:** Use Option 2 (link) or add the script where GHL allows external scripts (e.g. Site Builder → Scripts).

**Test:** Open `/scripts/test-cleanquote.html` on your dev server. In GHL, DevTools (F12) → Console for "CleanQuote script error" or load failures.
