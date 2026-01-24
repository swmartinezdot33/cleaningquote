# Comprehensive End-to-End Testing Plan

## Objective
Test the entire quote generation and appointment booking flow with real data to verify:
- Real contact creation
- Opportunity creation
- Quote custom object creation
- Note addition
- Contact-Quote association
- Tag application
- UTM parameter tracking
- Field mapping
- Appointment booking

## Prerequisites
1. GHL Location configured with valid token
2. Admin settings configured (calendars, users, tags)
3. Survey questions saved
4. UTM parameters in URL

## Test Scenario

### Step 1: Submit Form with UTM Parameters
**URL**: `http://localhost:3003/?utm_source=google&utm_medium=cpc&utm_campaign=raleigh_cleaning&utm_content=test_content&gclid=test_gclid_123`

**Form Data**:
```
First Name: John
Last Name: Doe  
Email: john.doe@example.com
Phone: (919) 555-1234
Service Address: 123 Main Street, Raleigh, NC 27609
Square Feet: Under 1,500 sq ft
Service Type: One Time Deep Clean
Full Baths: 2
Half Baths: 1
Bedrooms: 3
People in Home: 2
Shedding Pets: 1
Home Condition: Good - Generally clean
Previous Service: No, this is my first time
Cleaned Within 3 Months: No, not within the last 3 months
```

### Step 2: Verify in GHL (After Quote Submission)

#### 2.1 Contact Created
- [ ] Contact exists with name: John Doe
- [ ] Email: john.doe@example.com
- [ ] Phone: (919) 555-1234
- [ ] Address: 123 Main Street, Raleigh, NC 27609
- [ ] UTM Fields populated:
  - [ ] UTM Source: google
  - [ ] UTM Medium: cpc
  - [ ] UTM Campaign: raleigh_cleaning
  - [ ] UTM Content: test_content
  - [ ] GCLID: test_gclid_123
- [ ] Tags applied:
  - [ ] "Quote Request"
  - [ ] "One Time Deep Clean"
  - [ ] "one-time"
  - [ ] Any configured "Quote Completed" tags

#### 2.2 Quote Custom Object Created
- [ ] Quote object exists in GHL
- [ ] Quote ID is human-readable format (QT-YYMMDD-XXXXX) not UUID
- [ ] Field values stored:
  - [ ] firstName: John
  - [ ] lastName: Doe
  - [ ] email: john.doe@example.com
  - [ ] phone: (919) 555-1234
  - [ ] service_address: 123 Main Street, Raleigh, NC 27609, US
  - [ ] squareFeet: Under 1,500 sq ft
  - [ ] serviceType: One Time Deep Clean
  - [ ] frequency: one-time
  - [ ] fullBaths: 2
  - [ ] halfBaths: 1
  - [ ] bedrooms: 3
  - [ ] people: 2
  - [ ] sheddingPets: 1
  - [ ] condition: Good - Generally clean
  - [ ] hasPreviousService: false
  - [ ] cleanedWithin3Months: no

#### 2.3 Opportunity Created
- [ ] Opportunity exists linked to contact
- [ ] Opportunity name contains quote information
- [ ] Opportunity value shows calculated quote price

#### 2.4 Note Added
- [ ] Note exists on contact
- [ ] Note contains quote details
- [ ] Note includes price breakdown

#### 2.5 Association Created
- [ ] Contact-Quote association exists
- [ ] Quote is linked to the correct contact
- [ ] Relationship is bidirectional

### Step 3: Book Appointment from Quote

**Appointment Details**:
- Select an available time slot
- Verify no "locationId should not exist" error

#### 3.1 Appointment Created
- [ ] Appointment appears in GHL calendar
- [ ] Assigned to configured user
- [ ] Time matches selected slot
- [ ] Title includes service type
- [ ] Notes include quote info

#### 3.2 Contact Tagged
- [ ] "Appointment Booked" tag added (if configured)
- [ ] Contact tags updated

#### 3.3 Appointment Confirmation Page
- [ ] User sees confirmation message
- [ ] Confirmation page shows:
  - [ ] Quote ID
  - [ ] Appointment date/time
  - [ ] Contact information

## Data Verification Checklist

### Contact Fields
- [ ] firstName
- [ ] lastName
- [ ] email
- [ ] phone
- [ ] address1, city, state, postalCode, country (from service address)
- [ ] source: "Website Quote Form"
- [ ] utmSource
- [ ] utmMedium
- [ ] utmCampaign
- [ ] utmTerm
- [ ] utmContent
- [ ] gclid

### Quote Custom Object Fields
- [ ] firstName
- [ ] lastName
- [ ] email
- [ ] phone
- [ ] service_address (complete formatted address)
- [ ] squareFeet
- [ ] serviceType
- [ ] frequency
- [ ] fullBaths
- [ ] halfBaths
- [ ] bedrooms
- [ ] people
- [ ] sheddingPets
- [ ] condition
- [ ] hasPreviousService
- [ ] cleanedWithin3Months
- [ ] priceEstimate (calculated)
- [ ] quoteId (human-readable format)

### UTM Parameters Tracking
- [ ] All 5 UTM parameters reach contact
- [ ] GCLID parameter reaches contact
- [ ] Available in GHL reporting

### Tags Applied
- [ ] Service type tag
- [ ] Frequency tag
- [ ] "Quote Request" tag
- [ ] Configured "Quote Completed" tags
- [ ] Configured "Appointment Booked" tags

### Appointments Fields
- [ ] No locationId in request body (FIXED)
- [ ] Correct calendar used
- [ ] Correct user assigned
- [ ] Proper date/time formatting
- [ ] Notes included

## Survey Builder Resilience Test

### Test: Change Survey Question Labels
1. Go to admin Survey Builder
2. Change a question label (e.g., "What's your first name?" → "Tell us your first name")
3. Submit form again
4. Verify:
   - [ ] Form still works with new label
   - [ ] Field mapping still works (question ID is stable)
   - [ ] Data still maps to custom fields correctly
   - [ ] Quote creation succeeds

### Test: Reorder Questions
1. In Survey Builder, change question order
2. Submit form
3. Verify:
   - [ ] Form displays in new order
   - [ ] Data still maps correctly
   - [ ] All values reach GHL

### Test: Change Option Values
1. In Survey Builder, change option labels (e.g., "Under 1,500 sq ft" → "Small (Under 1500)")
2. Submit form selecting that option
3. Verify:
   - [ ] New label displays in form
   - [ ] Selected value still stores correctly
   - [ ] Quote calculation uses correct value

## Server Logs to Check
After each test step, verify server logs for:
- [ ] No errors in `/api/quote` response
- [ ] Contact created successfully
- [ ] Quote custom object created
- [ ] Note added
- [ ] Association created
- [ ] Appointment created
- [ ] All field mappings applied
- [ ] UTM parameters logged

## GHL API Calls Expected

1. **POST /contacts** - Create/update contact
2. **POST /opportunities** - Create opportunity  
3. **POST /custom-objects/{quoteObjectKey}** - Create quote
4. **POST /contacts/{id}/notes** - Add note
5. **GET /associations/key/contact_quote** - Get association definition
6. **POST /associations/relations** - Create contact-quote association
7. **POST /contacts/{id}?customFields=...** - Update contact custom fields
8. **POST /calendars/events/appointments** - Create appointment
9. **PUT /contacts/{id}** - Add tags

## Known Issues / Fixes Applied
- ✅ locationId removed from appointment payload (was causing "locationId should not exist" error)
- ✅ Service address now maps to quote custom object
- ✅ Quote ID now human-readable format (QT-YYMMDD-XXXXX)
- ⚠️ Survey Builder question changes - NEEDS VERIFICATION that IDs stay stable

## Pass/Fail Criteria
- **PASS**: All checkboxes checked, all data verified in GHL, appointment created without errors
- **FAIL**: Any required field missing, data not reaching GHL, appointment creation fails

---

## Running This Test

1. Start dev server: `npm run dev`
2. Open browser to URL with UTM parameters (see Step 1)
3. Fill out complete form
4. Submit and get quote ID
5. Copy quote ID from result page or URL
6. Verify in GHL using quote ID
7. Book appointment from quote page
8. Verify appointment in GHL calendar
9. Run post-test validation script

