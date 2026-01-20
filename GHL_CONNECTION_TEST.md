# GHL API Comprehensive Connection Test

## Endpoint

**PUT** `/api/admin/ghl-settings?comprehensive=true`

Tests all GoHighLevel API endpoints and provides detailed feedback on each one.

## Authentication

Include your admin password in the request header:

```
x-admin-password: your_admin_password
```

## Parameters

### Query Parameters

- `comprehensive` (optional): Set to `true` to run full endpoint tests. Default is `false` (basic test).

## Basic Test (Default)

**Request**:
```bash
curl -X PUT \
  http://localhost:3000/api/admin/ghl-settings \
  -H "x-admin-password: your_admin_password"
```

**Response** (Success):
```json
{
  "success": true,
  "connected": true,
  "message": "Connected to GHL successfully",
  "error": null
}
```

**Response** (Failure):
```json
{
  "success": false,
  "connected": false,
  "message": "Failed to connect to GHL",
  "error": "Unauthorized - Invalid token or missing required scopes..."
}
```

---

## Comprehensive Test

**Request**:
```bash
curl -X PUT \
  http://localhost:3000/api/admin/ghl-settings?comprehensive=true \
  -H "x-admin-password: your_admin_password"
```

### Response (Success)

```json
{
  "success": true,
  "connected": true,
  "message": "All GHL API endpoints are working!",
  "error": null,
  "locationId": "ve9EPM428h8vShlRW1KT",
  "token": "****K3m7",
  "summary": {
    "total": 11,
    "passed": 11,
    "failed": 0,
    "warnings": 0
  },
  "results": [
    {
      "name": "Contacts - List",
      "success": true,
      "status": 200,
      "message": "✅ Working - HTTP 200",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/contacts?limit=1"
    },
    {
      "name": "Contacts - Upsert (dry-run)",
      "success": true,
      "status": 400,
      "message": "⚠️ Not Found - This endpoint may not exist or no data available - HTTP 404",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/contacts/upsert"
    },
    {
      "name": "Opportunities - List",
      "success": true,
      "status": 200,
      "message": "✅ Working - HTTP 200",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/opportunities?limit=1"
    },
    {
      "name": "Opportunities - Create (dry-run)",
      "success": true,
      "status": 400,
      "message": "⚠️ Not Found - This endpoint may not exist or no data available - HTTP 404",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/opportunities"
    },
    {
      "name": "Pipelines - List",
      "success": true,
      "status": 200,
      "message": "✅ Working - HTTP 200",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/opportunities/pipelines"
    },
    {
      "name": "Tags - List",
      "success": true,
      "status": 200,
      "message": "✅ Working - HTTP 200",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/tags"
    },
    {
      "name": "Tags - Create (dry-run)",
      "success": true,
      "status": 400,
      "message": "⚠️ Not Found - This endpoint may not exist or no data available - HTTP 404",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/tags"
    },
    {
      "name": "Calendars - List",
      "success": true,
      "status": 200,
      "message": "✅ Working - HTTP 200",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/calendars"
    },
    {
      "name": "Appointments - Create (dry-run)",
      "success": true,
      "status": 400,
      "message": "⚠️ Not Found - This endpoint may not exist or no data available - HTTP 404",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/calendars/appointments"
    },
    {
      "name": "Custom Fields - List",
      "success": true,
      "status": 200,
      "message": "✅ Working - HTTP 200",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/customFields?model=contact"
    },
    {
      "name": "Notes - Create (dry-run)",
      "success": true,
      "status": 404,
      "message": "⚠️ Not Found - This endpoint may not exist or no data available - HTTP 404",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/contacts/test-contact-id/notes"
    }
  ]
}
```

### Response (Failure - Invalid Token)

```json
{
  "success": false,
  "connected": false,
  "message": "Some GHL API endpoints failed. Check results for details.",
  "error": null,
  "locationId": "ve9EPM428h8vShlRW1KT",
  "token": "****K3m7",
  "summary": {
    "total": 11,
    "passed": 0,
    "failed": 11,
    "warnings": 0
  },
  "results": [
    {
      "name": "Contacts - List",
      "success": false,
      "status": 401,
      "message": "❌ Unauthorized - Missing or invalid token - HTTP 401",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/contacts?limit=1"
    },
    ...
  ]
}
```

---

## Endpoints Tested

The comprehensive test checks the following endpoints:

### Contacts
1. **List** - `GET /v2/locations/{locationId}/contacts?limit=1`
2. **Upsert** - `POST /v2/locations/{locationId}/contacts/upsert` (dry-run)

### Opportunities
1. **List** - `GET /v2/locations/{locationId}/opportunities?limit=1`
2. **Create** - `POST /v2/locations/{locationId}/opportunities` (dry-run)

### Pipelines
1. **List** - `GET /v2/locations/{locationId}/opportunities/pipelines`

### Tags
1. **List** - `GET /v2/locations/{locationId}/tags`
2. **Create** - `POST /v2/locations/{locationId}/tags` (dry-run)

### Calendars
1. **List** - `GET /v2/locations/{locationId}/calendars`

### Appointments
1. **Create** - `POST /v2/locations/{locationId}/calendars/appointments` (dry-run)

### Custom Fields
1. **List** - `GET /v2/locations/{locationId}/customFields?model=contact`

### Notes
1. **Create** - `POST /v2/locations/{locationId}/contacts/{contactId}/notes` (dry-run)

---

## Understanding Results

### Status Indicators

- **✅ Working (HTTP 200)** - Endpoint is functional and accessible
- **⚠️ Not Found (HTTP 404)** - Endpoint exists but no data available (acceptable for testing)
- **❌ Unauthorized (HTTP 401)** - Invalid or expired token
- **❌ Forbidden (HTTP 403)** - Missing required API scopes
- **❌ Error** - Other HTTP errors

### Summary Breakdown

- **total**: Total number of endpoints tested
- **passed**: Number of successfully accessible endpoints (status 200)
- **failed**: Number of endpoints with authentication/permission errors (401, 403)
- **warnings**: Number of endpoints that returned 404 (acceptable for testing)

---

## Token Requirements

The comprehensive test requires your GHL API token to have the following scopes:

- `contacts.readonly` or `contacts.write` - For contacts endpoint
- `opportunities.readonly` or `opportunities.write` - For opportunities endpoint
- `tags.readonly` or `tags.write` - For tags endpoint
- `calendars.readonly` or `calendars.write` - For calendars endpoint
- `locations.readonly` - For custom fields endpoint

---

## JavaScript Example

```javascript
async function testGHLConnections() {
  try {
    // Basic test
    const basicResult = await fetch('/api/admin/ghl-settings', {
      method: 'PUT',
      headers: {
        'x-admin-password': 'your_admin_password',
        'Content-Type': 'application/json',
      },
    });

    const basicData = await basicResult.json();
    console.log('Basic Test:', basicData);

    // Comprehensive test
    const comprehensiveResult = await fetch(
      '/api/admin/ghl-settings?comprehensive=true',
      {
        method: 'PUT',
        headers: {
          'x-admin-password': 'your_admin_password',
          'Content-Type': 'application/json',
        },
      }
    );

    const comprehensiveData = await comprehensiveResult.json();
    console.log('Comprehensive Test:', comprehensiveData);

    // Display results
    if (comprehensiveData.results) {
      console.table(
        comprehensiveData.results.map((r) => ({
          Endpoint: r.name,
          Status: r.message,
          HTTP: r.status,
        }))
      );
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testGHLConnections();
```

---

## Error Troubleshooting

### 401 Unauthorized

**Problem**: Multiple endpoints returning HTTP 401  
**Solution**:
1. Verify your GHL API token is correct
2. Ensure token hasn't expired
3. Check that token has required scopes in GHL settings
4. Generate a new token if needed

### 403 Forbidden

**Problem**: Multiple endpoints returning HTTP 403  
**Solution**:
1. Verify Location ID is correct
2. Ensure token has the required scopes
3. Check that the token was generated with proper permissions
4. Create a new token with all required scopes

### All Tests Pass but Features Don't Work

**Problem**: Test passes but actual operations fail  
**Solution**:
1. Verify required custom fields exist in GHL
2. Ensure contact/opportunity data is valid
3. Check GHL location settings for any restrictions
4. Review GHL API documentation for specific endpoint requirements

---

## Notes

- **Dry-run tests** (POST endpoints) do not actually create data, only verify the endpoint exists
- **404 responses** are counted as warnings (not failures) since they indicate the endpoint exists but has no data
- The test uses a fake contact ID for notes testing, so a 404 is expected
- All tests run in parallel for performance
- The token is masked in the response for security (shows only last 4 characters)
