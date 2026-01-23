# Fast Troubleshooting Guide: Quote-to-Contact Association

## Quick Setup Checklist

### 1. Verify Environment Variables
```bash
# Check your .env.local file has:
GHL_API_TOKEN=your_token_here
GHL_LOCATION_ID=your_location_id_here
ADMIN_PASSWORD=your_admin_password
```

### 2. Start Local Development Server
```bash
npm run dev
```

Server should start on `http://localhost:3000`

---

## Step-by-Step Testing Flow

### Step 1: Test GHL Connection (30 seconds)
1. Open browser: `http://localhost:3000/admin`
2. Enter admin password
3. Go to **Settings** tab
4. Click **"Test GHL Connection"**
5. ✅ **Expected**: Green success message
6. ❌ **If fails**: Check token and location ID

### Step 2: Verify Quote Custom Object Exists in GHL (1 minute)
1. In GHL Dashboard: **Settings → Custom Objects**
2. Verify you have a **"Quote"** or **"quotes"** custom object
3. Note the exact name (case-sensitive)
4. Verify it has these fields:
   - `quote_id`
   - `service_address`
   - `square_footage`
   - `type`
   - `frequency`
   - `full_baths`
   - `half_baths`
   - `bedrooms`
   - `people_in_home`
   - `shedding_pets`
   - `current_condition`
   - `cleaning_service_prior`
   - `cleaned_in_last_3_months`

### Step 3: Test Quote Submission with Full Logging (2 minutes)

#### A. Open Browser Console
1. Open `http://localhost:3000` in Chrome/Firefox
2. Press `F12` to open DevTools
3. Go to **Console** tab
4. Keep it open during testing

#### B. Submit a Test Quote
1. Fill out the quote form completely:
   - First Name: `Test`
   - Last Name: `User`
   - Email: `test@example.com`
   - Phone: `555-123-4567`
   - Address: `123 Test St`
   - City: `Raleigh`
   - State: `NC`
   - Zip: `27601`
   - Complete all survey questions
2. Submit the form
3. **Watch the browser console** for any errors

#### C. Check Server Logs
In your terminal where `npm run dev` is running, look for:

**✅ Success indicators:**
```
✅ Contact created in GHL: [contact-id]
✅ Quote custom object created in GHL: [object-id]
🔗 Associating custom object [object-id] with contact [contact-id]...
✅ Successfully associated custom object [object-id] with contact [contact-id]
```

**❌ Error indicators to watch for:**
```
❌ Failed to associate custom object with contact
⚠️ Could not associate custom object with contact
GHL API Error (400)
GHL API Error (404)
```

### Step 4: Verify in GHL Dashboard (1 minute)

#### A. Check Contact Was Created
1. Go to GHL: **Contacts**
2. Search for `test@example.com`
3. ✅ **Expected**: Contact exists with all form data
4. Check **Custom Fields** tab - verify mapped fields are populated

#### B. Check Quote Custom Object
1. In GHL: **Settings → Custom Objects → Quotes**
2. Click **"View Records"** or **"Records"**
3. ✅ **Expected**: See your test quote record
4. Verify all fields are populated correctly

#### C. Check Association (CRITICAL)
1. Go back to the **Contact** you found
2. Look for a **"Quotes"** or **"Related"** section/tab
3. ✅ **Expected**: See the quote record linked to this contact
4. OR: Go to the **Quote record** and check for **"Contact"** field/link
5. ✅ **Expected**: See the contact linked

**If association is missing:**
- Check server logs for association errors
- Note the exact error message
- See "Common Issues" below

---

## Quick Debug Commands

### Check Server Logs in Real-Time
```bash
# In your terminal, filter for GHL-related logs:
npm run dev | grep -i "ghl\|quote\|contact\|associate"
```

### Test API Endpoints Directly

#### Test Contact Creation
```bash
curl -X POST http://localhost:3000/api/contacts/create-or-update \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "555-123-4567",
    "address": "123 Test St",
    "city": "Raleigh",
    "state": "NC",
    "postalCode": "27601"
  }'
```

#### Test Quote Creation (Full Flow)
```bash
curl -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test@example.com",
    "phone": "555-123-4567",
    "address": "123 Test St",
    "city": "Raleigh",
    "state": "NC",
    "postalCode": "27601",
    "squareFeet": "1500-2000",
    "serviceType": "general",
    "frequency": "weekly",
    "fullBaths": "2",
    "halfBaths": "1",
    "bedrooms": "3",
    "people": "2",
    "sheddingPets": "1",
    "condition": "good",
    "hasPreviousService": "false",
    "cleanedWithin3Months": "no"
  }'
```

---

## Common Issues & Quick Fixes

### Issue 1: "Failed to associate custom object with contact"

**Symptoms:**
- Quote is created ✅
- Contact is created ✅
- But they're not linked ❌

**Debug Steps:**
1. Check server logs for the exact error:
   ```
   ❌ Failed to associate at /associations/relations with targetKey...
   ```
2. Note which `targetKey` variation failed
3. Check GHL API documentation for correct format

**Quick Fix:**
- The code tries multiple `targetKey` formats:
  - `custom_objects.quotes` (most common)
  - `quotes`
  - `Quote`
  - `quote`
- If all fail, check your GHL custom object's exact schema key

### Issue 2: "Invalid Key Passed" or "400 Error"

**Symptoms:**
- Quote creation fails
- Error mentions "Invalid Key Passed"

**Debug Steps:**
1. Verify custom object field names match exactly (case-sensitive)
2. Check server logs for which fields are being sent
3. Compare with GHL custom object schema

**Quick Fix:**
- Field names must match exactly:
  - `quote_id` (not `quoteId` or `Quote_ID`)
  - `service_address` (not `serviceAddress`)
  - etc.

### Issue 3: "404 - Schema not found"

**Symptoms:**
- Quote creation fails
- Error: "Quote schema not found"

**Debug Steps:**
1. Verify custom object exists in GHL
2. Check exact name (case-sensitive)
3. Verify API token has `objects/record.write` scope

**Quick Fix:**
- Create the custom object in GHL if missing
- Ensure it's named exactly as expected (usually "quotes" or "Quote")

### Issue 4: Contact Created But Fields Not Mapped

**Symptoms:**
- Contact exists ✅
- But custom fields are empty ❌

**Debug Steps:**
1. Go to Admin → Survey Builder
2. Check if GHL Field Mappings are configured
3. Run the "GHL Custom Fields Mapping Test" in Admin

**Quick Fix:**
- Configure mappings in Survey Builder
- Map each question to a GHL custom field
- Save and test again

---

## Fast Verification Checklist

Run through this checklist after each test:

- [ ] Contact created in GHL
- [ ] Contact has correct name, email, phone
- [ ] Contact custom fields populated (if mappings configured)
- [ ] Quote custom object created in GHL
- [ ] Quote has all fields populated
- [ ] Quote is associated with contact (visible in contact's related records)
- [ ] No errors in server logs
- [ ] No errors in browser console

---

## Advanced: Enable Verbose Logging

Add this to your code temporarily for more detailed logs:

```typescript
// In src/lib/ghl/client.ts, around line 1050
console.log('🔍 FULL ASSOCIATION DEBUG:', {
  objectId: objectIdForAssociation,
  schemaKey: schemaKeyForAssociation,
  recordId: customObject.id,
  contactId: data.contactId,
  locationId: finalLocationId,
  endpoint: '/associations/relations',
  payload: {
    locationId: finalLocationId,
    sourceKey: 'Contact',
    sourceId: data.contactId,
    targetKey: schemaKeyForAssociation,
    targetId: customObject.id,
  }
});
```

---

## Next Steps After Troubleshooting

Once you identify the issue:

1. **If association endpoint is wrong**: Update the endpoint in `associateCustomObjectWithContact()`
2. **If targetKey format is wrong**: Update `targetKeyVariations` array
3. **If field names don't match**: Update field mappings in quote creation
4. **If schema key is wrong**: Update `actualSchemaKey` detection logic

---

## Quick Test Script

Save this as `test-quote-flow.sh`:

```bash
#!/bin/bash

echo "🧪 Testing Quote Flow..."

# Test 1: Contact Creation
echo "1. Testing contact creation..."
CONTACT_RESPONSE=$(curl -s -X POST http://localhost:3000/api/contacts/create-or-update \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test'$(date +%s)'@example.com",
    "phone": "555-123-4567",
    "address": "123 Test St",
    "city": "Raleigh",
    "state": "NC",
    "postalCode": "27601"
  }')

echo "Contact Response: $CONTACT_RESPONSE"

# Test 2: Quote Creation
echo "2. Testing quote creation..."
QUOTE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/quote \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "email": "test'$(date +%s)'@example.com",
    "phone": "555-123-4567",
    "address": "123 Test St",
    "city": "Raleigh",
    "state": "NC",
    "postalCode": "27601",
    "squareFeet": "1500-2000",
    "serviceType": "general",
    "frequency": "weekly",
    "fullBaths": "2",
    "halfBaths": "1",
    "bedrooms": "3",
    "people": "2",
    "sheddingPets": "1",
    "condition": "good",
    "hasPreviousService": "false",
    "cleanedWithin3Months": "no"
  }')

echo "Quote Response: $QUOTE_RESPONSE"
echo "✅ Test complete! Check server logs and GHL dashboard."
```

Make it executable:
```bash
chmod +x test-quote-flow.sh
./test-quote-flow.sh
```

---

## Time Estimate

- **Full test cycle**: ~5 minutes
- **Quick verification**: ~2 minutes
- **Debugging specific issue**: 5-15 minutes depending on complexity

---

## Need Help?

If you're stuck, check the server logs for:
1. Exact error messages
2. Which API endpoint was called
3. What payload was sent
4. What response was received

Share these details for faster troubleshooting!
