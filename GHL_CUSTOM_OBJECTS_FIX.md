# GHL Custom Objects Error Fix

## Issues Fixed

### 1. Schema Listing Errors (404)
**Problem:** The code was trying to list object schemas using `/objects` endpoint, which returned 404 errors.

**Fix:** 
- Made schema listing optional and non-blocking
- If schema listing fails, the code now gracefully falls back to trying common schema key variations
- Improved error messages to indicate that schema listing is optional

### 2. Custom Object Creation Errors (400 "Invalid Key Passed")
**Problem:** Custom object creation was failing with "Invalid Key Passed" errors, likely because:
- The Quote custom object schema doesn't exist in the GHL account
- Field keys don't match the schema
- The schema key name is different than expected

**Fix:**
- Improved error messages to provide clear troubleshooting steps
- Made custom object creation failures non-blocking (quote still delivers)
- Added detailed logging to help identify the issue

### 3. No Field Mappings Warning
**Status:** This is expected if you haven't configured GHL field mappings in your survey questions. It's informational only and doesn't prevent the quote from working.

## Current Behavior

✅ **Quote calculation works** - Quotes are still calculated and delivered to users
✅ **Contact creation works** - Contacts are still created/updated in GHL
✅ **Opportunity creation works** (if enabled)
✅ **Custom object creation fails gracefully** - If it fails, the quote still delivers but logs helpful error messages

## If You Want to Use Custom Objects

To enable Quote custom object creation in GHL, you need to:

### Step 1: Create the Quote Custom Object in GHL

1. Log into your GHL account
2. Go to **Settings > Custom Objects**
3. Click **Create Custom Object** or **Add Object**
4. **Important:** Name it **"quotes"** (lowercase plural) - this matches the GHL template format `{{ custom_objects.quotes.field_name }}`
   - The code will try variations, but "quotes" is tried first
5. Add the following fields to your Quote object (use these exact field names):

   Required fields (use these exact field names - they match the code):
   - `quote_id` (Text)
   - `service_address` (Text)
   - `square_footage` (Text or Number)
   - `type` (Text) - Service type (general, initial, deep, etc.)
   - `frequency` (Text) - Cleaning frequency (weekly, bi-weekly, etc.)
   - `full_baths` (Number)
   - `half_baths` (Number)
   - `bedrooms` (Number)
   - `people_in_home` (Number)
   - `shedding_pets` (Number)
   - `current_condition` (Text)
   - `cleaning_service_prior` (Text) - Yes/No
   - `cleaned_in_last_3_months` (Text) - Yes/No
   - `quote_range_low` (Number)
   - `quote_range_high` (Number)

   **Note:** The field names in GHL should match exactly (case-sensitive). The code will automatically map these to the schema field keys when creating records.

### Step 2: Verify API Token Permissions

Ensure your GHL API token has the `objects/record.write` scope enabled:
1. Go to your GHL account settings
2. Navigate to API/Integrations
3. Check your Private Integration Token (PIT) or Access Token
4. Ensure `objects/record.write` scope is enabled

### Step 3: Test

After creating the custom object:
1. Submit a test quote through your form
2. Check the logs - you should see: `✅ Quote custom object created in GHL`
3. Verify in GHL that the Quote object was created with the contact

## Error Messages

If custom object creation fails, you'll see helpful error messages in the logs:

- **"Invalid Key Passed"** - Usually means:
  - The field keys don't match your schema (check that field names match exactly)
  - The schema key is wrong (should be "quotes" lowercase plural)
  - The schema doesn't exist in your GHL account
- **"404 Not Found"** - The Quote schema doesn't exist in your GHL account (create it as "quotes")
- **"401 Unauthorized"** - Your API token lacks the required `objects/record.write` scope

## Optional: Disable Custom Object Creation

If you don't want to use custom objects, you can ignore the errors - they're non-blocking and won't affect quote delivery. The code will continue to work normally, just without creating Quote custom objects.

## Summary

The fixes ensure that:
- ✅ Custom object creation failures don't block quote delivery
- ✅ Better error messages help troubleshoot setup issues
- ✅ Schema listing failures are handled gracefully
- ✅ All other GHL integrations (contacts, opportunities, notes) continue to work

The quote form will continue to work perfectly even if custom objects aren't set up. Custom objects are an optional feature for storing detailed quote information in a structured format in GHL.
