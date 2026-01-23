# Full Flow Testing Guide

## Tracking Flow Implementation

### Stage 1: Initial Form Fill (Event)
- **URL:** `/?utm_source=...&utm_medium=...&utm_campaign=...`
- **Event:** `form_submitted`
- **Action:** User fills out and submits the form
- **Redirect:** `/quote/{quoteId}?utm_source=...&utm_medium=...&utm_campaign=...`

### Stage 2: Quote Completion (Event)
- **URL:** `/quote/{quoteId}?utm_source=...&utm_medium=...&utm_campaign=...`
- **Event:** `quote_completed`
- **Action:** Quote page loads, showing quote details
- **User Action:** Clicks "Book an Appointment" or "Schedule a Callback"

### Stage 3: Appointment/Callback Confirmation (Event)
- **URL:** `/quote/{quoteId}/appointment-confirmed?utm_source=...&utm_medium=...&utm_campaign=...`
  OR `/quote/{quoteId}/callback-confirmed?utm_source=...&utm_medium=...&utm_campaign=...`
- **Event:** `appointment_confirmed` or `callback_confirmed`
- **Action:** Confirmation page loads after successful booking

## Analytics Events Tracked

1. **form_submitted** - Fired when form is submitted
   - Includes: serviceType, frequency, squareFeet, people, pets, quoteId
   - Preserves UTM parameters through redirect

2. **quote_completed** - Fired when quote page loads
   - Includes: quote_id, service_type, frequency
   - Tracks pageview with quote URL

3. **appointment_confirmed** - Fired when appointment confirmation page loads
   - Includes: quote_id, event_category: 'Booking'
   - Tracks conversion events

4. **callback_confirmed** - Fired when callback confirmation page loads
   - Includes: quote_id, event_category: 'Booking'
   - Tracks conversion events

## UTM Parameter Preservation

UTM parameters are preserved throughout the entire journey:
- Initial form URL → Quote page URL → Confirmation page URL

Parameters preserved:
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_term`
- `utm_content`
- `gclid` (Google Click ID)

## Testing the Flow

1. Start with UTM parameters: `/?utm_source=test&utm_medium=email&utm_campaign=january_sale`
2. Fill out the form completely
3. Submit form → Should redirect to quote page with UTM params
4. Click "Book an Appointment" → Should redirect to confirmation page with UTM params
5. Verify all events fire in browser console and analytics tools
