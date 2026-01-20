# GHL Test Connection Wizard

## Overview

The GHL Test Connection Wizard is a comprehensive visual tool that tests all GoHighLevel API endpoints at once and displays detailed feedback for each one. It's integrated directly into the Admin Settings page for easy access.

## Features

✨ **One-Click Testing**: Test all 11 endpoints simultaneously  
📊 **Visual Feedback**: Color-coded results with status indicators  
🎯 **Detailed Results**: Per-endpoint status, HTTP codes, and error messages  
⚡ **Performance**: Parallel testing for fast results  
🔍 **Summary Statistics**: Overview of passed, failed, and warning endpoints  
📈 **Progress Bar**: Visual representation of success rate  

## Location

**Admin Settings** → **GHL API Configuration** → **Comprehensive Endpoint Test**

## How to Use

### 1. Navigate to the Test Wizard

1. Go to **Admin Settings** page
2. Expand the **GHL API Configuration** section
3. Scroll down to **Comprehensive Endpoint Test**

### 2. Run the Test

Click the **"Test All Endpoints"** button to start testing.

The test will:
- Send requests to all 11 GHL API endpoints in parallel
- Check authentication and permissions
- Verify endpoint accessibility
- Collect HTTP status codes and error messages

### 3. Review Results

#### Summary Card

Shows overall status with:
- **Location ID**: Your GHL location identifier
- **Success Rate**: Percentage of endpoints working
- **Progress Bar**: Visual representation of success rate

#### Statistics Grid

Shows four key metrics:
- **Total**: Number of endpoints tested (always 11)
- **Passed**: Number of endpoints returning HTTP 200
- **Failed**: Number of endpoints with auth/permission errors
- **Warnings**: Number of endpoints returning 404 (no data, acceptable)

#### Endpoint Results

Each endpoint displays:
- **Status Icon**: ✅ (working), ⚠️ (no data), ❌ (error)
- **Endpoint Name**: What was tested
- **HTTP Code**: Response status code
- **Endpoint URL**: The API path used
- **Message**: Detailed feedback or error description

### 4. Interpret the Results

#### ✅ Green (HTTP 200 - Success)

**Status**: Endpoint is working correctly  
**Action**: No action needed - everything is functioning properly

**Example Message**: `✅ Working - HTTP 200`

#### ⚠️ Yellow (HTTP 404 - No Data)

**Status**: Endpoint exists but no data available (normal for testing)  
**Action**: No action needed - this is expected during testing

**Example Message**: `⚠️ Not Found - This endpoint may not exist or no data available - HTTP 404`

#### ❌ Red (HTTP 401/403 - Error)

**Status**: Authentication or permission issue  
**Action**: Update your GHL token configuration

**401 - Unauthorized**:
- Token is invalid or expired
- Generate a new Personal Integration Token (PIT) from GHL

**403 - Forbidden**:
- Token is missing required scopes
- Regenerate the token with all required scopes enabled

**Example Messages**:
- `❌ Unauthorized - Missing or invalid token - HTTP 401`
- `❌ Forbidden - Missing required scope - HTTP 403`

#### ❌ Red (Other Errors)

**Status**: Various connectivity or server issues  
**Action**: Check error message and contact support if needed

## Endpoints Tested

The wizard tests these 11 endpoints:

### Contacts (2 endpoints)
1. **Contacts - List** - Can read your contacts
   - Endpoint: `GET /v2/locations/{id}/contacts?limit=1`
   - Tests: Read permission

2. **Contacts - Upsert** - Can create/update contacts
   - Endpoint: `POST /v2/locations/{id}/contacts/upsert`
   - Tests: Write permission

### Opportunities (2 endpoints)
3. **Opportunities - List** - Can read opportunities
   - Endpoint: `GET /v2/locations/{id}/opportunities?limit=1`
   - Tests: Read permission

4. **Opportunities - Create** - Can create opportunities
   - Endpoint: `POST /v2/locations/{id}/opportunities`
   - Tests: Write permission

### Pipelines (1 endpoint)
5. **Pipelines - List** - Can read sales pipelines
   - Endpoint: `GET /v2/locations/{id}/opportunities/pipelines`
   - Tests: Read permission for configuration

### Tags (2 endpoints)
6. **Tags - List** - Can read tags
   - Endpoint: `GET /v2/locations/{id}/tags`
   - Tests: Read permission

7. **Tags - Create** - Can create tags
   - Endpoint: `POST /v2/locations/{id}/tags`
   - Tests: Write permission

### Calendars (1 endpoint)
8. **Calendars - List** - Can read calendars
   - Endpoint: `GET /v2/locations/{id}/calendars`
   - Tests: Read permission for appointments

### Appointments (1 endpoint)
9. **Appointments - Create** - Can create appointments
   - Endpoint: `POST /v2/locations/{id}/calendars/appointments`
   - Tests: Write permission for bookings

### Custom Fields (1 endpoint)
10. **Custom Fields - List** - Can read custom fields
    - Endpoint: `GET /v2/locations/{id}/customFields?model=contact`
    - Tests: Read permission for field mapping

### Notes (1 endpoint)
11. **Notes - Create** - Can create notes on contacts
    - Endpoint: `POST /v2/locations/{id}/contacts/{id}/notes`
    - Tests: Write permission for notes

## Troubleshooting Guide

### All endpoints return 401 Unauthorized

**Cause**: Your GHL API token is invalid, expired, or incorrect

**Solution**:
1. Log into your GoHighLevel account
2. Go to **Developer Settings** → **Integrations**
3. Create or regenerate a new **Personal Integration Token (PIT)**
4. Ensure the location-level token is selected
5. Copy the token (it will only be shown once)
6. Return to Admin Settings
7. Paste the new token in the **GHL Private Integration Token** field
8. Enter your Location ID (from your GHL dashboard URL)
9. Click **Save Token**
10. Re-run the test

### Multiple endpoints return 403 Forbidden

**Cause**: Token is missing required API scopes

**Solution**:
1. Log into your GoHighLevel account
2. Go to **Developer Settings** → **Integrations**
3. Edit your token/application
4. Enable these scopes:
   - `contacts.write` (required)
   - `opportunities.write` (for opportunities)
   - `calendars.write` (for appointments)
   - `tags.write` (for tags)
   - `locations.readonly` (for general access)
5. Save and regenerate the token if prompted
6. Update your token in Admin Settings
7. Re-run the test

### Mixed results (some pass, some fail)

**Cause**: Token has limited scopes, missing specific features

**Option 1**: If you need all features
- Add missing scopes to your token
- Regenerate and update in Admin Settings
- Re-run the test

**Option 2**: If you don't need certain features
- Determine which endpoints can safely fail
- Document the limitation
- Continue using the integration for available features

### "Test Failed" Error

**Cause**: Network issue, server error, or authentication header problem

**Solution**:
1. Verify your admin password is correct
2. Check your internet connection
3. Wait a few seconds and try again
4. Check browser console for detailed error messages
5. If persists, contact support with:
   - Error message from browser console
   - Which endpoints are affected
   - Your GHL location ID (masked)

## UI Components

### Status Indicators

| Icon | Status | HTTP | Meaning |
|------|--------|------|---------|
| ✅ | Green | 200 | Working |
| ⚠️ | Yellow | 404 | No data (acceptable) |
| ❌ | Red | 401 | Unauthorized |
| ❌ | Red | 403 | Forbidden |
| ❌ | Red | Other | Error |

### Buttons

**Test All Endpoints** (Primary)
- Runs the comprehensive test
- Shows loading state while testing
- Disabled during testing

**Run Again** (Secondary)
- Re-run the test with same configuration
- Useful for verifying fixes
- Shows only after first test completes

**Clear Results** (Secondary)
- Clears test results from display
- Allows starting fresh
- Shows only after first test completes

## Performance

- **Test Duration**: Typically 2-5 seconds
- **Testing Method**: Parallel requests (all endpoints tested simultaneously)
- **Network Calls**: 11 HTTP requests
- **Data Transferred**: Minimal (test requests only)
- **Cache**: No caching - always fresh results

## Security

- **Token Display**: Masked in responses (shows only last 4 characters)
- **Password Required**: Admin password required to run test
- **No Data Stored**: Test results stored only in browser memory
- **No Logging**: Detailed responses not logged on server
- **API Keys**: Not exposed in responses or logs

## Integration Notes

The test wizard is built as a separate component (`GHLTestWizard.tsx`) for reusability:

```jsx
import { GHLTestWizard } from '@/components/GHLTestWizard';

export function MyComponent({ adminPassword }: { adminPassword: string }) {
  return <GHLTestWizard adminPassword={adminPassword} />;
}
```

The component:
- Handles all API calls internally
- Manages its own state
- Provides visual feedback
- No external dependencies required
- Fully self-contained

## Next Steps After Testing

1. **If All Pass**: Your GHL integration is ready to use
2. **If Some Fail**: 
   - Follow troubleshooting guide above
   - Update token/scopes
   - Re-run test to verify
3. **If All Fail**:
   - Verify token is correct
   - Check token hasn't expired
   - Regenerate with all required scopes
   - Update in Admin Settings
   - Re-run test

## Related Documentation

- [GHL Test Quick Start](./GHL_TEST_QUICK_START.md)
- [Full API Documentation](./GHL_CONNECTION_TEST.md)
- [Endpoint Audit](./GHL_ENDPOINTS_AUDIT.md)
- [GHL Official Docs](https://github.com/GoHighLevel/highlevel-api-docs)
