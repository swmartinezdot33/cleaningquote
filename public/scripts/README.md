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
<script src="https://www.cleanquote.io/api/script/cleanquote.js?v=5"></script>
```

The script injects a “Get Quote” button that opens the survey with the current contact as query params. Optional: `data-base-url`, `data-tool-slug`, `data-org-slug`, `data-button-text`, `data-container-selector`, `data-open-in-iframe`. The script reads contact from `window.__CONTACT__`, `window.contact`, `window.ghlContact`, or DOM `data-contact-*`.

**If the script doesn't run in GHL:** Many GHL pages or custom code areas block external script tags. Use **Option 1 (link)** instead, or add the script where GHL allows external scripts (e.g. Site Builder → Scripts).

**Iframe on contact page:** Add `data-open-in-iframe="true"` to open the form in an iframe on the contact page (button click loads the form inline). Enable **Form is iframed** in the tool's HighLevel settings so the form pre-fills from GHL and lands on the address step.

**Test locally:** Open `/scripts/test-cleanquote.html` on your dev server to confirm the script injects. In GHL, open DevTools (F12) → Console and look for "CleanQuote script error" or script load failures.
