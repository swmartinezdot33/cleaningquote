# Vercel KV (Upstash Redis) Storage Setup Guide

This application now uses Vercel KV (Upstash Redis) storage to store and retrieve the pricing Excel file instead of relying on a static file in the repository.

## Setup Instructions

### 1. Connect Vercel KV (Upstash Redis)

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** or connect an existing Upstash Redis database
4. Follow the setup wizard to create/connect the database

### 2. Environment Variables

Vercel automatically injects these environment variables when you connect KV:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `KV_REST_API_READ_ONLY_TOKEN`
- `KV_URL`
- `REDIS_URL`

**Optional:** Add a custom API key for upload protection:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
```
SUPABASE_UPLOAD_API_KEY=your_secure_api_key_here
```
Generate a secure random string (e.g., `openssl rand -hex 32`)

### 3. Upload Initial Pricing File

Use the upload API endpoint (see below) or upload programmatically:
```bash
curl -X POST \
  https://quote.raleighcleaningcompany.com/api/admin/upload-pricing \
  -H "x-api-key: your_api_key" \
  -F "file=@2026 Pricing.xlsx"
```

## Upload API Endpoint

### Endpoint

**POST** `/api/admin/upload-pricing`

Upload pricing Excel file to Vercel KV (Upstash Redis) storage.

### Authentication (Optional but Recommended)

Include the API key in one of these ways:
- Header: `x-api-key: your_api_key_here`
- Query parameter: `?apiKey=your_api_key_here`

### Request Format

Send a `multipart/form-data` request with a file field named `file`:

```bash
curl -X POST \
  https://quote.raleighcleaningcompany.com/api/admin/upload-pricing \
  -H "x-api-key: your_api_key_here" \
  -F "file=@/path/to/2026 Pricing.xlsx"
```

### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Pricing file uploaded successfully to Vercel KV storage",
  "size": 11264,
  "uploadedAt": "2024-01-19T12:00:00.000Z"
}
```

**Error (400/500):**
```json
{
  "error": "Error message here"
}
```

### Check Current File

**GET** `/api/admin/upload-pricing`

Returns information about the current pricing file:

```json
{
  "exists": true,
  "file": {
    "name": "2026 Pricing.xlsx",
    "size": 11264,
    "uploadedAt": "2024-01-19T12:00:00.000Z",
    "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  }
}
```

## Cache Invalidation

The pricing table is cached in memory for performance. After uploading a new file, the cache will be automatically cleared on the next request. If you need to force a cache clear immediately, restart your Vercel deployment.

## Security Notes

1. **API Key**: Always use the `SUPABASE_UPLOAD_API_KEY` environment variable to protect the upload endpoint
2. **Service Role Key**: Never expose this in client-side code - it has full access to your Supabase project
3. **Bucket Permissions**: Consider making the bucket private and using RLS policies for better security

## Troubleshooting

### Error: "Failed to load pricing file from KV storage"

- Check that Vercel KV is connected to your project
- Verify environment variables are set (KV_REST_API_URL, KV_REST_API_TOKEN)
- Ensure a pricing file has been uploaded using the upload API
- Check Vercel project logs for detailed error messages

### Error: "Unauthorized"

- Verify your API key matches the `SUPABASE_UPLOAD_API_KEY` environment variable
- Check that the API key is being sent correctly in headers or query params
