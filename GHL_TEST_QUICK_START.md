# GHL API Comprehensive Test - Quick Start Guide

## Overview

The comprehensive test feature checks all GoHighLevel API endpoints your application uses and provides detailed feedback on each one.

## Quick Test

### Using cURL (Basic)

```bash
curl -X PUT \
  http://localhost:3000/api/admin/ghl-settings \
  -H "x-admin-password: your_admin_password"
```

**Response**: Simple success/failure indicator

### Using cURL (Comprehensive)

```bash
curl -X PUT \
  "http://localhost:3000/api/admin/ghl-settings?comprehensive=true" \
  -H "x-admin-password: your_admin_password"
```

**Response**: Detailed endpoint-by-endpoint results

---

## What Gets Tested

✅ **11 Endpoints Checked**:

1. **Contacts - List** (can read contacts)
2. **Contacts - Upsert** (can create/update contacts)
3. **Opportunities - List** (can read opportunities)
4. **Opportunities - Create** (can create opportunities)
5. **Pipelines - List** (can read sales pipelines)
6. **Tags - List** (can read tags)
7. **Tags - Create** (can create tags)
8. **Calendars - List** (can read calendars)
9. **Appointments - Create** (can create appointments)
10. **Custom Fields - List** (can read custom fields)
11. **Notes - Create** (can create notes on contacts)

---

## Response Example - Success

```json
{
  "success": true,
  "connected": true,
  "message": "All GHL API endpoints are working!",
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
      "name": "Opportunities - List",
      "success": true,
      "status": 200,
      "message": "✅ Working - HTTP 200",
      "endpoint": "/v2/locations/ve9EPM428h8vShlRW1KT/opportunities?limit=1"
    },
    // ... more endpoints ...
  ]
}
```

---

## Response Example - Failure

```json
{
  "success": false,
  "connected": false,
  "message": "Some GHL API endpoints failed. Check results for details.",
  "locationId": "ve9EPM428h8vShlRW1KT",
  "token": "****K3m7",
  "summary": {
    "total": 11,
    "passed": 6,
    "failed": 5,
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
    // ... more results ...
  ]
}
```

---

## Understanding Status Codes

| Status | Meaning | Action |
|--------|---------|--------|
| ✅ HTTP 200 | **Success** - Endpoint is working | No action needed |
| ⚠️ HTTP 404 | **No Data** - Endpoint exists but empty | Normal, counted as warning |
| ❌ HTTP 401 | **Invalid Token** - Token missing or expired | Update token in settings |
| ❌ HTTP 403 | **No Permission** - Missing API scopes | Generate new token with scopes |

---

## Troubleshooting

### All endpoints return 401

**Problem**: Your GHL API token is invalid or expired  
**Solution**:
1. Go to Admin Settings
2. Delete the current GHL token
3. Generate a new Personal Integration Token (PIT) from GHL
4. Ensure these scopes are enabled:
   - contacts.write
   - opportunities.write
   - tags.write
   - calendars.write
5. Paste the new token and save

### Most endpoints return 403

**Problem**: Token missing required scopes  
**Solution**:
1. Go to GHL Developer Settings
2. Edit your application/integration
3. Enable all required scopes
4. Generate a new token
5. Update in Admin Settings

### Some endpoints pass, some fail

**Problem**: Token has limited permissions  
**Solution**:
1. Check which endpoints are failing
2. Verify those features are needed for your use case
3. If needed, generate a token with additional scopes
4. If not needed, you can ignore those results

---

## Using the Test from JavaScript

```javascript
// Basic test
async function testBasic() {
  const res = await fetch('/api/admin/ghl-settings', {
    method: 'PUT',
    headers: { 'x-admin-password': 'your_password' },
  });
  const data = await res.json();
  console.log(data.message);
}

// Comprehensive test
async function testComprehensive() {
  const res = await fetch('/api/admin/ghl-settings?comprehensive=true', {
    method: 'PUT',
    headers: { 'x-admin-password': 'your_password' },
  });
  const data = await res.json();
  
  if (data.summary) {
    console.log(`✅ Passed: ${data.summary.passed}/${data.summary.total}`);
    console.log(`❌ Failed: ${data.summary.failed}/${data.summary.total}`);
    console.log(`⚠️ Warnings: ${data.summary.warnings}/${data.summary.total}`);
    
    // Show failed endpoints
    const failed = data.results.filter(r => !r.success);
    failed.forEach(r => {
      console.error(`${r.name}: ${r.message}`);
    });
  }
}

// Run it
testComprehensive();
```

---

## Integration with Admin UI

The test feature is designed to be integrated into your admin settings page:

```jsx
// Example admin settings component
export function AdminSettings() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState(null);

  const handleTest = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/admin/ghl-settings?comprehensive=true', {
        method: 'PUT',
        headers: { 'x-admin-password': adminPassword },
      });
      const data = await res.json();
      setResults(data);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <button onClick={handleTest} disabled={testing}>
        {testing ? 'Testing...' : 'Test GHL Connection'}
      </button>
      
      {results && (
        <div>
          <h3>Test Results</h3>
          <p>Passed: {results.summary.passed}/{results.summary.total}</p>
          <p>Failed: {results.summary.failed}/{results.summary.total}</p>
          
          <ul>
            {results.results.map(r => (
              <li key={r.name}>
                {r.success ? '✅' : '❌'} {r.name}: {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## Next Steps

After running the comprehensive test:

1. **If all pass**: Your GHL integration is working correctly!
2. **If some fail**: 
   - Check the error messages
   - Update your API token if authentication failed
   - Verify location ID is correct
3. **If all fail**: 
   - Verify token is correct and not expired
   - Ensure token has all required scopes
   - Check that location ID matches your GHL account

---

## Reference Documentation

- [Full API Documentation](./GHL_CONNECTION_TEST.md)
- [Endpoint Audit](./GHL_ENDPOINTS_AUDIT.md)
- [GHL Official Docs](https://github.com/GoHighLevel/highlevel-api-docs)
