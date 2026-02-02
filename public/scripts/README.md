# CleanQuote.io – GHL: pass query params to the survey

Two ways to open your survey with the current contact as query params so the form pre-fills.

---

## Option 1: Link (no script) – recommended

Use a **link** in GHL that points to our redirect. No script, no CORS. Just pass query params to the survey.

**In GHL:** Add a custom link/button and set the URL to (use your domain and GHL merge tags):

```
https://www.cleanquote.io/api/ghl?contactId={{contact.id}}&firstName={{contact.firstName}}&lastName={{contact.lastName}}&email={{contact.email}}&phone={{contact.phone}}&address={{contact.address}}
```

Optional params: `&city={{contact.city}}&state={{contact.state}}&postalCode={{contact.postalCode}}`  
For org-scoped survey: `&orgSlug=your-org&toolSlug=default`

When the user clicks, they’re redirected to the survey with those params; the form pre-fills. Replace `www.cleanquote.io` with your CleanQuote domain.

---

## Option 2: Script tag

Use the API URL and **do not** add `crossorigin="anonymous"`:

```html
<script src="https://www.cleanquote.io/api/script/cleanquote.js?v=4"></script>
```

The script injects a “Get Quote” button that opens the survey with the current contact as query params. Optional: `data-base-url`, `data-tool-slug`, `data-org-slug`, `data-button-text`, `data-container-selector`. The script reads contact from `window.__CONTACT__`, `window.contact`, `window.ghlContact`, or DOM `data-contact-*`.
