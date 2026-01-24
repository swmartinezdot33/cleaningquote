# Notes Endpoint Testing Guide

## Overview

This guide explains how to test the note creation functionality to ensure it's working correctly.

## Changes Made

1. **Fixed the notes endpoint** in `src/lib/ghl/client.ts`:
   - Updated from `/contacts/{contactId}/notes` to `/v2/locations/{locationId}/contacts/{contactId}/notes`
   - Added proper locationId retrieval and validation
   - Matches GHL API v2 standard format

2. **Updated comprehensive test** in `src/lib/ghl/client.ts`:
   - Fixed test endpoint to use correct format: `/v2/locations/${locationId}/contacts/test-contact-id/notes`

3. **Created dedicated test endpoint** at `/api/admin/ghl-notes-test`:
   - Creates a test contact (or uses existing)
   - Creates a note on that contact
   - Verifies note creation works end-to-end

## Testing Methods

### Method 1: Use the Comprehensive Test (Recommended)

1. Go to **Admin Settings** page
2. Navigate to **GHL API Configuration** section
3. Click **"Test All Endpoints"** button
4. Look for **"Notes - Create Endpoint (dry-run)"** in the results
5. Should show ✅ **Success** if working correctly

**Expected Result:**
- Status: `200 OK` or `401/403` (both indicate endpoint is correct, just auth/permission issues)
- Success: `true` if endpoint format is correct

### Method 2: Use the Dedicated Notes Test Endpoint

#### Option A: Test with New Contact (Automatic)

```bash
curl -X POST http://localhost:3000/api/admin/ghl-notes-test \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD" \
  -d '{
    "testNote": "This is a test note to verify note creation is working!"
  }'
```

#### Option B: Test with Existing Contact

```bash
curl -X POST http://localhost:3000/api/admin/ghl-notes-test \
  -H "Content-Type: application/json" \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD" \
  -d '{
    "contactId": "EXISTING_CONTACT_ID",
    "testNote": "This is a test note on an existing contact!"
  }'
```

#### Expected Response (Success):

```json
{
  "success": true,
  "message": "Note creation test passed!",
  "results": {
    "contact": {
      "id": "contact-id-here",
      "created": true
    },
    "note": {
      "id": "note-id-here",
      "contactId": "contact-id-here",
      "body": "This is a test note...",
      "createdAt": "2026-01-23T..."
    }
  },
  "testDetails": {
    "endpoint": "/v2/locations/LOCATION_ID/contacts/CONTACT_ID/notes",
    "method": "POST",
    "locationId": "LOCATION_ID"
  }
}
```

#### Expected Response (Error):

```json
{
  "success": false,
  "error": "Note creation failed",
  "details": "Error message here",
  "troubleshooting": {
    "contactId": "...",
    "locationId": "...",
    "endpoint": "...",
    "suggestions": [...]
  }
}
```

### Method 3: Test Through Quote Creation Flow

1. Fill out the quote form on the homepage
2. Submit the form
3. Check server logs for note creation messages:
   - Look for: `✅ Note created successfully:`
   - Or: `⚠️ Failed to create note:`

4. Verify in GHL:
   - Go to the contact in GHL
   - Check the Notes tab
   - Should see a note titled "Quote Generated from Website Form"

## Verification Checklist

- [ ] Comprehensive test shows Notes endpoint as ✅ Success
- [ ] Dedicated test endpoint creates note successfully
- [ ] Note appears in GHL contact record
- [ ] Note contains expected content
- [ ] Server logs show success messages
- [ ] No errors in server logs

## Troubleshooting

### Issue: "Location ID is required"
**Solution:** Configure Location ID in Admin Settings → GHL API Configuration

### Issue: "GHL API token not configured"
**Solution:** Set up GHL API token in Admin Settings → GHL API Configuration

### Issue: "Note creation failed" with 401/403
**Solution:** 
- Verify API token has `contacts.write` scope
- Check token is a location-level token (not account-level)
- Regenerate token if needed

### Issue: "Note creation failed" with 404
**Solution:**
- Verify contact ID exists in GHL
- Check locationId is correct
- Ensure contact belongs to the correct location

### Issue: Note endpoint returns 422
**Solution:**
- Verify endpoint format is correct: `/v2/locations/{locationId}/contacts/{contactId}/notes`
- Check request body format: `{ body: "note text" }`
- Ensure locationId is in the URL path, not body

## Code Locations

- **Note creation function**: `src/lib/ghl/client.ts` (line 375)
- **Note creation in quote flow**: `src/app/api/quote/route.ts` (line 682)
- **Test endpoint**: `src/app/api/admin/ghl-notes-test/route.ts`
- **Comprehensive test**: `src/lib/ghl/client.ts` (line 1749)

## API Endpoint Format

**Correct Format (Current):**
```
POST /v2/locations/{locationId}/contacts/{contactId}/notes
```

**Request Body:**
```json
{
  "body": "Note content here"
}
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
Version: 2021-07-28
Location-Id: {locationId} (optional, if needed by endpoint)
```

## Next Steps

After testing:
1. Verify note creation works in production quote flow
2. Check notes are being created for all quotes (if enabled)
3. Monitor server logs for any note creation errors
4. Verify notes appear correctly in GHL contact records
