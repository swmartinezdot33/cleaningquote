# How to Run Comprehensive End-to-End Test

This guide walks you through testing the ENTIRE quote generation and appointment booking pipeline to verify all data flows correctly.

## What We're Testing

- ✅ Real contact creation in GHL
- ✅ Quote custom object with human-readable ID
- ✅ All form fields mapped correctly
- ✅ Service address stored
- ✅ UTM parameters tracked
- ✅ Opportunity created
- ✅ Note created
- ✅ Tags applied
- ✅ Contact-Quote association
- ✅ Appointment booking (no locationId error)

## Prerequisites

- Dev server running on localhost:3003
- GHL account with Location configured
- Admin settings configured (calendars, users, tags)
- `GHL_TOKEN` and `LOCATION_ID` in `.env.local`

## Step-by-Step Instructions

### Step 1: Start the Dev Server

Terminal 1:
```bash
cd /Users/stevenmartinez/cleaningquote
npm run dev
```

Wait for:
```
✓ Ready in 1638ms
✓ Compiled / in 2.6s
```

### Step 2: Navigate to Form with UTM Parameters

Open browser to:
```
http://localhost:3003/?utm_source=google&utm_medium=cpc&utm_campaign=raleigh_cleaning&utm_content=test_content&utm_term=cleaning_services&gclid=test_gclid_123456
```

This URL adds UTM parameters and GCLID which should be tracked to the contact.

### Step 3: Fill Out the Complete Form

**Page 1 - Basic Info:**
- First Name: `John`
- Last Name: `Doe`
- Email: `john.doe.test@example.com`
- Phone: `(919) 555-1234`

**Page 2 - Service Details:**
- Service Address: `123 Main Street, Raleigh, NC` (use autocomplete)
- Home Size: `Under 1,500 sq ft`
- Service Type: `One Time Deep Clean`
- Full Baths: `2`
- Half Baths: `1`
- Bedrooms: `3`
- People: `2`
- Pets: `1`
- Condition: `Good - Generally clean`
- Previous Service: `No, this is my first time`
- Cleaned Recently: `No, not within the last 3 months`

**Page 3 - Quote Result:**
- Copy the **Quote ID** from the page (format: QT-YYMMDD-XXXXX)
- Take a screenshot

Example Quote ID: `QT-260124-A9F2X`

### Step 4: Verify Contact in GHL

1. Go to your GHL account
2. Search contacts for: `john.doe.test@example.com`
3. Verify contact has:
   - Name: John Doe
   - Email: john.doe.test@example.com
   - Phone: (919) 555-1234
   - Address: 123 Main Street, Raleigh, NC
   - **UTM Fields** (scroll to see):
     - UTM Source: `google`
     - UTM Medium: `cpc`
     - UTM Campaign: `raleigh_cleaning`
     - UTM Content: `test_content`
     - UTM Term: `cleaning_services`
     - GCLID: `test_gclid_123456`
   - **Tags** (should include):
     - "Quote Request"
     - "One Time Deep Clean"
     - "one-time"

✅ Take screenshot of contact with all UTM fields visible

### Step 5: Verify Quote Custom Object in GHL

1. Go to GHL admin
2. Navigate to Custom Objects → Quotes
3. Search for your quote ID (e.g., `QT-260124-A9F2X`)
4. Open the quote
5. Verify ALL fields are present and correct:
   - firstName: John
   - lastName: Doe
   - email: john.doe.test@example.com
   - phone: (919) 555-1234
   - **service_address: 123 Main Street, Raleigh, NC 27609, US** (THIS IS CRITICAL)
   - squareFeet: Under 1,500 sq ft
   - serviceType: One Time Deep Clean (or similar)
   - frequency: one-time
   - fullBaths: 2
   - halfBaths: 1
   - bedrooms: 3
   - people: 2
   - sheddingPets: 1
   - condition: Good

✅ Take screenshot showing quote with service_address field

### Step 6: Verify Opportunity in GHL

1. From the contact (John Doe)
2. Look for "Opportunities" section
3. Should see an opportunity created from the quote
4. Verify it shows the quote price

✅ Take screenshot

### Step 7: Verify Notes in GHL

1. From the contact (John Doe)
2. Look for "Notes" section
3. Should see a note with quote details
4. Verify it contains pricing information

✅ Take screenshot

### Step 8: Book an Appointment

**From the Quote Page:**
1. Click "Book Appointment" button
2. Select a date and time from the calendar
3. Click "Confirm Appointment"
4. Verify:
   - ❌ NO error about "locationId should not exist" (THIS WAS THE BUG - NOW FIXED)
   - ✅ Appointment confirmation page shows
   - ✅ Quote ID displayed
   - ✅ Date/time confirmed

✅ Take screenshot of confirmation

### Step 9: Verify Appointment in GHL

1. Go to GHL Calendar
2. Find the appointment on the date you selected
3. Verify:
   - Title includes service type
   - Assigned to correct user
   - Time matches what you selected
   - Associated with John Doe contact

✅ Take screenshot

### Step 10: Verify Contact Tags Updated

1. Go back to contact (John Doe)
2. Check tags - should now include:
   - "Appointment Booked" (if configured)

✅ Take screenshot

### Step 11: Run Automated Verification Script

Terminal 2 (new terminal):
```bash
cd /Users/stevenmartinez/cleaningquote
node test-e2e-comprehensive.mjs QT-260124-A9F2X
```

Replace `QT-260124-A9F2X` with YOUR actual quote ID.

**Expected output:**
```
✅ Quote Found
✅ Contact Created
✅ All Fields Mapped
✅ UTM Parameters
✅ Tags Applied
✅ Opportunity Created
✅ Notes Added
✅ Appointment Booked
✅ Association Created

📊 Score: 8/8 (100%)
🎉 All checks passed!
```

### Step 12: Verify Server Logs

Check the dev server terminal for logs:

```bash
# Should see successful operations:
Creating appointment with payload: {
  contactId: '***hidden***',
  title: 'One Time Deep Clean - John Doe',
  startTime: '...',
  endTime: '...',
  calendarId: '...',
  assignedTo: '...',
  notes: 'Test appointment booking'
}
# NOTICE: NO locationId in payload! (This was the fix)

POST /api/appointments/create 200 in 1234ms
# Should be 200, not 500
```

## Testing Results Summary

Create a test results document with:

```markdown
# E2E Test Results - [DATE]

## Quote ID Tested: QT-260124-A9F2X

### Data Verification ✅
- [ ] Contact created with all fields
- [ ] UTM parameters on contact (source, medium, campaign, content, term, gclid)
- [ ] Quote custom object created
- [ ] Service address in quote: 123 Main Street, Raleigh, NC 27609, US
- [ ] All quote fields populated
- [ ] Opportunity created
- [ ] Note created
- [ ] Tags applied correctly
- [ ] Appointment booked without errors
- [ ] Automated test script passed (8/8)

### Appointment Booking ✅
- [ ] No "locationId should not exist" error
- [ ] Confirmation page shows correctly
- [ ] Appointment visible in GHL calendar
- [ ] Contact tagged with "Appointment Booked"

### UTM Tracking ✅
- [ ] UTM Source: google
- [ ] UTM Medium: cpc
- [ ] UTM Campaign: raleigh_cleaning
- [ ] UTM Content: test_content
- [ ] UTM Term: cleaning_services
- [ ] GCLID: test_gclid_123456

### Status
✅ ALL TESTS PASSED - READY FOR PRODUCTION
```

## Troubleshooting

### "locationId should not exist" Error
- ❌ BAD: This means the bug is still present
- ✅ GOOD: This was fixed in commit `f43b4d5`
- Verify you have latest code: `git pull`

### Missing Service Address in Quote
- Check: Is service address saved in quote custom object `service_address` field?
- Fix: Verify address components are sent from form
- Check server logs for: `serviceAddress string is built from...`

### UTM Parameters Not on Contact
- Check: Are they in the form request?
- Check server logs for: `✅ Added UTM source to contact`
- Verify parameters in URL

### Contact Not Found
- Make sure to use exact email: `john.doe.test@example.com`
- Wait a moment for GHL to sync
- Try searching by phone instead

### Appointment Not Showing in Calendar
- Check: Is appointment assigned to right user?
- Check: Is appointment in right calendar?
- Check: Is the calendar configured in admin settings?

## Quick Checklist for Production

Before going live, confirm:

```
✅ Contact creation works
✅ Service address maps to custom field
✅ Quote ID is human-readable (QT-YYMMDD-XXXXX)
✅ All form fields reach GHL
✅ UTM parameters tracked
✅ Opportunity created
✅ Note created
✅ Tags applied
✅ Appointment booking works
✅ No "locationId" errors
✅ Automated test passes
```

## Support

If tests fail:
1. Check server logs (npm run dev terminal)
2. Check GHL admin for contact/quote
3. Run manual verification steps 1-10
4. Run automated script with debug output
5. Check `SURVEY_BUILDER_RESILIENCE.md` if forms have issues

---

**Last Updated:** 2026-01-24
**Status:** ✅ All fixes verified and committed
