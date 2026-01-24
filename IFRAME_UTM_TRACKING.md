# Iframe UTM Parameter Tracking

## Overview

The widget now automatically extracts and preserves UTM parameters from the parent page when embedded in an iframe. This allows marketers to track traffic sources even when the widget is embedded on external websites.

## How It Works

### 1. Initial Load
When the widget is embedded on a page with UTM parameters:
```
https://partner-site.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=january_sale
```

The widget.js script:
- Extracts UTM parameters from the parent page URL
- Passes them to the iframe: `/?embedded=true&utm_source=facebook&utm_medium=cpc&utm_campaign=january_sale`

### 2. Form Submission
- User fills out form in iframe
- Form submits with UTM parameters preserved
- Redirects to quote page: `/quote/{id}?utm_source=facebook&utm_medium=cpc&utm_campaign=january_sale`

### 3. Quote Page
- Quote page loads with UTM parameters
- User clicks "Book an Appointment"
- Redirects to confirmation: `/quote/{id}/appointment-confirmed?utm_source=facebook&utm_medium=cpc&utm_campaign=january_sale`

## UTM Parameters Preserved

The following parameters are automatically extracted and preserved:
- `utm_source` - Traffic source (e.g., "facebook", "google")
- `utm_medium` - Marketing medium (e.g., "cpc", "email", "social")
- `utm_campaign` - Campaign name (e.g., "january_sale")
- `utm_term` - Campaign term/keyword
- `utm_content` - Campaign content/variant
- `gclid` - Google Click ID

## Testing

### Test with UTM Parameters

1. **Create a test HTML file** (see `test-widget-embed.html`):
```html
<!DOCTYPE html>
<html>
<head>
    <title>Widget Test</title>
</head>
<body>
    <div id="cleaning-quote-widget"></div>
    <script src="http://localhost:3000/widget.js" 
        data-base-url="http://localhost:3000"
        data-container-id="cleaning-quote-widget">
    </script>
</body>
</html>
```

2. **Open with UTM parameters:**
```
file:///path/to/test-widget-embed.html?utm_source=test&utm_medium=email&utm_campaign=january_sale
```

3. **Fill out the form** in the embedded widget

4. **Verify UTM parameters** are preserved in:
   - Quote page URL
   - Confirmation page URL
   - All analytics events

### Test on External Site

1. Embed widget on external site:
```html
<div id="quote-widget"></div>
<script src="https://yoursite.com/widget.js" 
    data-base-url="https://yoursite.com"
    data-container-id="quote-widget">
</script>
```

2. Send traffic with UTM parameters:
```
https://external-site.com/?utm_source=facebook&utm_medium=cpc&utm_campaign=january_sale
```

3. UTM parameters will automatically flow through:
   - Initial iframe load
   - Form submission
   - Quote page
   - Confirmation page

## Analytics Events

All analytics events include UTM parameters:
- `form_submitted` - Fires on form submission
- `quote_completed` - Fires on quote page load
- `appointment_confirmed` - Fires on appointment confirmation
- `callback_confirmed` - Fires on callback confirmation

## Implementation Details

### Widget.js Changes
- `extractUTMParams()` - Extracts UTM params from parent page
- `buildQueryString()` - Includes UTM params in iframe URL
- `postMessage` handler - Updates iframe src on navigation

### Page.tsx Changes
- Preserves UTM params on form submission redirect
- Detects iframe embedding
- Sends postMessage to parent on navigation

### Quote Page Changes
- Preserves UTM params on appointment/callback redirects
- Detects iframe embedding
- Sends postMessage to parent on navigation

## Benefits

1. **Complete Attribution** - Track traffic source through entire customer journey
2. **Multi-Site Tracking** - Works when widget is embedded on partner sites
3. **Automatic** - No configuration needed, works out of the box
4. **Cross-Origin Safe** - Uses postMessage for secure communication

## Example Flow

```
External Site: https://partner.com/?utm_source=facebook&utm_medium=cpc
  ↓
Widget Iframe: /?embedded=true&utm_source=facebook&utm_medium=cpc
  ↓ (form_submitted)
Quote Page: /quote/123?utm_source=facebook&utm_medium=cpc
  ↓ (quote_completed)
  ↓ (user books appointment)
Confirmation: /quote/123/appointment-confirmed?utm_source=facebook&utm_medium=cpc
  ↓ (appointment_confirmed)
```

All UTM parameters are preserved throughout the entire journey! 🎯
