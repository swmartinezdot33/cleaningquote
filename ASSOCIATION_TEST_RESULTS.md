# Association test results

**Run:** `npm run test:association` (dev server must be running).  
**With relation test:** `node scripts/test-association.mjs <quoteRecordId> <contactId>`

---

## 1. GET (list / find Contact–Quote)

- **`/associations/key/contact_quote?locationId=...`** → 200, returns the definition.
- `contactQuoteFound: true`, `contactQuoteAssociationId: "697445c276c06f46a91e9728"`.
- `/v2/locations/.../associations`, `/associations?locationId=`, `/associations` can return 400 when empty; `/associations/key/contact_quote` is used first.

---

## 2. PUT (create Contact–Quote association definition)

- **Body:** `locationId`, `key: "contact_quote"`, `firstObjectLabel: "Contact"`, `firstObjectKey: "contact"`, `secondObjectLabel: "Quote"`, `secondObjectKey: "custom_objects.quotes"`.
- **201** when created.
- **400 "duplicate pair of labels"** → treated as success (definition already exists).

---

## 3. GET (verify)

- Same as (1). After PUT, GET continues to find it via `/associations/key/contact_quote`.

---

## 4. POST (create relation quote ↔ contact)

- Resolves `associationId` via `/associations/key/contact_quote`.
- **Payload:** `{ associationId, firstRecordId: contactId, secondRecordId: quoteRecordId, locationId }`  
  (`firstRecordId` = contact, `secondRecordId` = quote, matching the definition).
- **200** with real GHL `quoteRecordId` and `contactId`.
- **422 "Invalid record id : '…' for association : contact_quote"** when IDs are fake or wrong → relation API is working; need valid GHL record IDs.

---

## Summary

| Step | Result |
|------|--------|
| GET  | ✅ Finds Contact–Quote via `/associations/key/contact_quote` |
| PUT  | ✅ Creates definition or treats "duplicate" as success |
| GET  | ✅ Confirms definition exists |
| POST | ✅ Finds `associationId`, calls `/associations/relations`; fails only when quote/contact IDs are invalid |

The quote flow (`createCustomObject` + `associateCustomObjectWithContact`) uses the same `/associations/key/contact_quote` and `/associations/relations` logic, so new quotes are linked to contacts when the definition exists.
