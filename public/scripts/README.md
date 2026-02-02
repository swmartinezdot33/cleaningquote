# CleanQuote.io Script (GHL)

Adds a "Get Quote" button that opens your survey with the **current contact as query params** (`firstName`, `lastName`, `email`, `phone`, `address`, `contactId`, etc.). The survey/iframe reads those params and pre-fills the form. No base-URL fuss—just pass query params to the iframe.

## In GHL: one script tag

Use the API URL and **do not** add `crossorigin="anonymous"`:

```html
<script src="https://www.cleanquote.io/api/script/cleanquote.js?v=4"></script>
```

Replace the domain with your CleanQuote origin. Bump `?v=4` when you update the script. The script uses the same origin as its `src` for the survey URL unless you set `data-base-url`.

### Optional data attributes

- **data-base-url** – Survey origin (default: same as script URL origin).
- **data-tool-slug** – Default `"default"`.
- **data-org-slug** – For `/t/orgSlug/toolSlug` URLs.
- **data-button-text** – Default `"Get Quote"`.
- **data-container-selector** – Where to inject the button (e.g. `#cleanquote-container`).

## Contact data → query params

The script reads the current contact from `window.__CONTACT__`, `window.contact`, `window.ghlContact`, or DOM `data-contact-*` attributes, then builds the survey URL with `?firstName=...&lastName=...&email=...&phone=...&address=...&contactId=...` so the survey/iframe pre-fills. If GHL exposes the contact another way, set `window.__CONTACT__` before the script runs.
