# Iframe UTM Parameter Test Results

## Test Setup

**Parent Page URL:**
```
http://127.0.0.1:8080/test-widget-embed.html?utm_source=facebook&utm_medium=cpc&utm_campaign=january_sale&gclid=test123
```

## Test Results

### ✅ Step 1: Iframe Initial Load

**Iframe URL Verified:**
```
http://localhost:3000/?embedded=true&utm_source=facebook&utm_medium=cpc&utm_campaign=january_sale&gclid=test123
```

**Result:** ✅ **PASS**
- UTM parameters successfully extracted from parent page
- All parameters passed to iframe: `utm_source`, `utm_medium`, `utm_campaign`, `gclid`
- `embedded=true` flag correctly added

### Step 2: Form Submission (In Progress)

**Expected Behavior:**
- Form submits with UTM parameters preserved
- Redirects to: `/quote/{quoteId}?utm_source=facebook&utm_medium=cpc&utm_campaign=january_sale&gclid=test123`
- `form_submitted` event fires

### Step 3: Quote Page Load

**Expected Behavior:**
- Quote page loads with UTM parameters in URL
- `quote_completed` event fires
- User can click "Book an Appointment"

### Step 4: Appointment Booking

**Expected Behavior:**
- User books appointment
- Redirects to: `/quote/{quoteId}/appointment-confirmed?utm_source=facebook&utm_medium=cpc&utm_campaign=january_sale&gclid=test123`
- `appointment_confirmed` event fires

## Implementation Status

✅ **Widget.js** - Extracts UTM params from parent page
✅ **Page.tsx** - Preserves UTM params on form redirect
✅ **Quote Page** - Preserves UTM params on booking redirects
✅ **PostMessage** - Handles iframe navigation updates

## Next Steps

To complete the test:
1. Fill out the form completely in the iframe
2. Submit form and verify redirect to quote page with UTM params
3. Book an appointment and verify redirect to confirmation page with UTM params
4. Check browser console for all tracking events
