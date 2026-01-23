# GHL Objects Debug Endpoint

This endpoint helps us see exactly what objects and fields exist in your GHL account so we can fix the custom object creation.

## How to Use

### Option 1: Using curl (Terminal)

```bash
curl -X GET "http://localhost:3000/api/admin/ghl-objects-debug" \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD"
```

Or if deployed:
```bash
curl -X GET "https://your-domain.com/api/admin/ghl-objects-debug" \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD"
```

### Option 2: Using the Test Script

1. Make sure you have `ADMIN_PASSWORD` set in your `.env` file
2. Run:
```bash
node test-ghl-objects.js
```

### Option 3: Using Browser/Postman

1. Open your browser or Postman
2. Go to: `http://localhost:3000/api/admin/ghl-objects-debug`
3. Add header: `x-admin-password: YOUR_ADMIN_PASSWORD`
4. Send GET request

## What It Returns

The endpoint will return:
- All custom objects in your GHL account
- Detailed schema for each object (including field keys, IDs, types)
- Specifically highlights any "quote" related objects
- Shows the exact field structure we need to match

## What to Do Next

1. **Run the endpoint** and copy the full JSON response
2. **Share the logs** - especially the `detailedSchemas` section
3. **I'll update the code** to use the exact field keys/IDs from your GHL account

## Expected Output

You should see something like:
```json
{
  "success": true,
  "locationId": "...",
  "totalObjects": 1,
  "quoteObjects": [
    {
      "key": "quotes",
      "name": "Quotes"
    }
  ],
  "detailedSchemas": [
    {
      "schemaKey": "quotes",
      "fieldCount": 15,
      "fields": [
        {
          "key": "quote_id",
          "name": "Quote ID",
          "id": "...",
          "type": "text"
        },
        ...
      ]
    }
  ]
}
```

This will tell us:
- ✅ The exact schema key (is it "quotes", "Quote", or something else?)
- ✅ The exact field keys we need to use
- ✅ Whether we should use field `key`, `name`, or `id` when creating records

## Troubleshooting

If you get errors:
- **401 Unauthorized**: Check your `ADMIN_PASSWORD` is correct
- **500 Error**: Check that GHL token and location ID are configured
- **Empty results**: The `/objects` endpoint might not be available - we'll need to try a different approach
