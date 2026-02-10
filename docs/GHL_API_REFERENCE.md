# GoHighLevel API v2 – local reference

A clone of the official [GoHighLevel highlevel-api-docs](https://github.com/GoHighLevel/highlevel-api-docs) repo is kept in this project for local reference when implementing GHL integrations.

**Location:** `docs/ghl-api-docs/`

## Where to look

| What you need | Path |
|---------------|------|
| **Objects** (custom objects, records, search) | `docs/ghl-api-docs/apps/objects.json` |
| **Opportunities** (pipelines, search) | `docs/ghl-api-docs/apps/opportunities.json` |
| **Contacts** | `docs/ghl-api-docs/apps/contacts.json` |
| **Associations** | `docs/ghl-api-docs/apps/associations.json` |
| **OAuth / auth** | `docs/ghl-api-docs/docs/oauth/` |
| **User context (iframe/postMessage)** | `docs/ghl-api-docs/docs/marketplace modules/shared_secret_customJS_customPages.md` |
| **Webhook events** | `docs/ghl-api-docs/docs/webhook events/` |

The `apps/*.json` files are OpenAPI 3.0 specs: paths, parameters, request/response schemas. Use them to confirm exact endpoint URLs, query/body parameter names (e.g. `locationId` vs `location_id`), and required fields.

## Updating the clone

To refresh the local copy with the latest from GitHub:

```bash
cd docs/ghl-api-docs && git pull
```
