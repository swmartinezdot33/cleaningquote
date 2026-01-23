# GHL Custom Objects Testing Guide

## Quick Troubleshooting - No Server Logs Needed!

We've added a comprehensive testing tool that shows all logs directly in the browser, so you don't need to check server logs anymore.

## How to Use

1. **Go to Admin Settings**
   - Navigate to `/admin/settings`
   - Enter your admin password

2. **Find the Custom Objects Test Section**
   - Scroll down to the "Custom Objects Test" section
   - It's right below the "Comprehensive Endpoint Test"

3. **Click "Test Custom Objects Endpoint"**
   - The test will run automatically
   - All logs appear directly in the browser
   - No need to check Vercel logs or server console!

## What the Test Does

The test performs these steps automatically:

1. **Lists all object schemas** - Finds all custom objects in your GHL account
2. **Fetches Quote schema** - Gets detailed field definitions for the Quote object
3. **Tests creation** - Attempts to create a test custom object record
4. **Tests endpoints** - Tries different endpoint variations to find what works
5. **Shows all logs** - Every step is logged and displayed in the response

## Understanding the Results

### ✅ Success Indicators
- **Schemas Found**: Number of custom objects found in your GHL account
- **Quote Schema**: ✓ means the Quote object was found
- **Creation Test**: ✓ means a test record was successfully created
- **Endpoints Passed**: How many endpoint variations worked

### ❌ Common Issues

#### "Quote Schema Not Found"
- **Problem**: The Quote custom object doesn't exist in your GHL account
- **Solution**: 
  1. Go to GHL → Settings → Custom Objects
  2. Create a new custom object named "quotes" (lowercase plural)
  3. Add the fields you need (quote_id, service_type, etc.)

#### "Creation Test Failed"
- **Problem**: The endpoint or field keys don't match
- **Solution**: Check the logs to see which endpoint and field keys were tried
- The logs will show exactly what was sent and what error was returned

#### "Invalid Key Passed" Error
- **Problem**: Field keys in your code don't match the schema
- **Solution**: 
  1. Check the "Detailed Results" section to see the actual field keys from your schema
  2. Update your code to use the exact field keys shown in the schema

## Using the Logs

### Viewing Logs
- Logs are shown in a collapsible section
- Click "Test Logs" to expand/collapse
- All timestamps and data are included

### Copying Logs
- Click "Copy Logs" to copy all logs to clipboard
- Useful for sharing with support or debugging

### Detailed Results
- Click "Detailed Results" to see the full JSON response
- Shows schema details, field definitions, and test results

## API Endpoint

You can also call the test endpoint directly:

```bash
GET /api/admin/ghl-custom-objects-test
Headers:
  x-admin-password: YOUR_ADMIN_PASSWORD
```

The response includes:
- `success`: Boolean indicating overall test result
- `summary`: Quick stats about the test
- `logs`: Array of all log messages (with timestamps)
- `errors`: Array of any errors encountered
- `results`: Detailed results including schemas, fields, and test outcomes

## Testing with Custom Data

You can also POST to the endpoint to test with your own data:

```bash
POST /api/admin/ghl-custom-objects-test
Headers:
  x-admin-password: YOUR_ADMIN_PASSWORD
Body:
{
  "objectType": "quotes",
  "customFields": {
    "quote_id": "test-123",
    "service_type": "Deep Clean",
    "frequency": "One-time"
  }
}
```

## Tips for Faster Troubleshooting

1. **Always check the logs first** - They show exactly what was tried and what failed
2. **Look at the "Detailed Results"** - Shows the actual schema structure from GHL
3. **Check field keys** - Make sure your code uses the exact field keys from the schema
4. **Try the test multiple times** - Sometimes GHL API has temporary issues
5. **Compare with GHL UI** - Make sure the custom object exists and has the right fields

## No More Server Logs!

With this tool, you can:
- ✅ See all logs in the browser
- ✅ Copy logs for sharing
- ✅ Test endpoints without leaving the admin panel
- ✅ Get detailed error messages with context
- ✅ See exactly what was sent to GHL API

No need to:
- ❌ Check Vercel logs
- ❌ SSH into servers
- ❌ Use Vercel CLI
- ❌ Switch between browser and terminal

## Next Steps

If the test fails:
1. Read the error messages in the logs
2. Check the "Detailed Results" to see the schema structure
3. Verify your GHL custom object exists and has the correct fields
4. Update your code to match the schema field keys
5. Run the test again

If the test passes:
- Your custom objects endpoint is working correctly!
- You can use the same endpoint and field keys in your production code
