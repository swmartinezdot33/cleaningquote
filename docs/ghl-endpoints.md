# GHL location endpoints reference

Canonical list of GHL (LeadConnector) location-scoped endpoints we use. Every new call must go through the central client’s `request()` with the same path and params so behavior is consistent and testable.

- **Base URL:** `https://services.leadconnectorhq.com`
- **Auth:** Location token → `Authorization: Bearer {token}`; do **not** send `Location-Id`. Agency/tool token → send `Location-Id` when scoping by location.
- **Headers:** `Content-Type: application/json`, `Version: 2021-07-28`

## Areas and endpoints

| Area | Method | Path | Notes |
|------|--------|------|-------|
| **Contacts** | GET | `/contacts` | Query: locationId, limit, query? |
| | GET | `/contacts/:contactId` | Single contact |
| | POST | `/contacts/upsert` | Body: contact + locationId |
| | PUT | `/contacts/:contactId` | Update contact |
| | GET/POST | `/contacts/:contactId/notes` | List / create note |
| **Opportunities** | GET | `/opportunities/search` | Query: location_id, limit, skip, pipeline_id?, status? |
| | GET | `/opportunities/pipelines` | Query: locationId |
| | GET | `/v2/locations/:locationId/opportunities/pipelines` | v2 fallback |
| | POST | `/opportunities/` | Create |
| | PUT | `/opportunities/:id` | Update |
| **Objects** | GET | `/objects?locationId=` or `/objects/:schemaKey?locationId=` | Schemas |
| | POST | `/objects/:schemaKey/records` | Create record |
| | POST | `/objects/:schemaKey/records/search` | Body: locationId, page, pageLimit |
| | GET | `/objects/:id/records/:recordId?locationId=` | Single record |
| **Associations** | GET | `/associations/key/:key?locationId=` | By key name |
| | GET | `/associations/objectKey/:key?locationId=` | By object key |
| | GET | `/associations/relations/:recordId?locationId=&skip=0&limit=100` | Relations for record |
| | POST | `/associations/relations` | Body: locationId, associationId, firstRecordId, secondRecordId |
| **Locations** | GET | `/locations/:locationId` | Location details |
| **Calendars** | GET | `/calendars/?locationId=` | List calendars |
| | POST | `/calendars/events/appointments` | Create appointment |
| | GET | `/calendars/:calendarId/free-slots?startDate=&endDate=&locationId=` | Free slots |
| | GET | `/calendars/events?locationId=&calendarId=&startTime=&endTime=` | Events |
| **Tags / Users / Custom fields** | GET | `/locations/:locationId/tags` or `/v2/locations/:locationId/tags` | Tags |
| | GET | `/users/?locationId=` | Users |
| | GET | `/locations/:locationId/customFields?model=contact\|opportunity` | Custom fields |

For full request/response shapes and “Used in” references, see the plan: `.cursor/plans/ghl_centralized_client_reliability_78ba6b14.plan.md` (§2.5).

## Adding a new endpoint

1. Add a row to the table above and to the plan’s §2.5 table.
2. Add an entry to `src/lib/ghl/endpoint-registry.ts` if it should be included in the reliability script.
3. Add a helper in `src/lib/ghl/ghl-client.ts` that calls `request()` with the exact method, path, and params.
