# Supabase Storage Setup Guide

This application now uses Supabase Storage to store and retrieve the pricing Excel file instead of relying on a static file in the repository.

## Setup Instructions

### 1. Create Supabase Storage Bucket

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Name the bucket: `pricing-files`
5. Set it to **Public** (or Private with proper RLS policies)
6. Click **Create bucket**

### 2. Upload Initial Pricing File

1. In the `pricing-files` bucket
2. Click **Upload file**
3. Upload your `2026 Pricing.xlsx` file
4. Ensure the file is named exactly: `2026 Pricing.xlsx`

### 3. Configure Environment Variables

Add these environment variables to your Vercel project:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the following:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_UPLOAD_API_KEY=your_secure_api_key_here (optional but recommended)
```

**Where to find these values:**
- Go to Supabase Dashboard → Settings → API
- `NEXT_PUBLIC_SUPABASE_URL`: Your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your anon/public key
- `SUPABASE_SERVICE_ROLE_KEY`: Your service_role key (keep this secret!)

**SUPABASE_UPLOAD_API_KEY**: Create a secure random string (e.g., generate with `openssl rand -hex 32`)

### 4. Set Storage Policies (if bucket is private)

If your bucket is private, add policies to allow the service role to read:

```sql
-- Allow service role to read all files
CREATE POLICY "Service role can read pricing files"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'pricing-files');

-- Allow service role to upload/update files
CREATE POLICY "Service role can upload pricing files"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'pricing-files');

CREATE POLICY "Service role can update pricing files"
ON storage.objects FOR UPDATE
TO service_role
USING (bucket_id = 'pricing-files');
```

## Upload API Endpoint

### Endpoint

**POST** `/api/admin/upload-pricing`

### Authentication (Optional but Recommended)

Include the API key in one of these ways:
- Header: `x-api-key: your_api_key_here`
- Query parameter: `?apiKey=your_api_key_here`

### Request Format

Send a `multipart/form-data` request with a file field named `file`:

```bash
curl -X POST \
  https://your-domain.com/api/admin/upload-pricing \
  -H "x-api-key: your_api_key_here" \
  -F "file=@/path/to/2026 Pricing.xlsx"
```

### JavaScript/TypeScript Example

```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('/api/admin/upload-pricing?apiKey=your_api_key', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result);
```

### Response

**Success (200):**
```json
{
  "success": true,
  "message": "Pricing file uploaded successfully",
  "file": "2026 Pricing.xlsx",
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
    "updatedAt": "2024-01-19T12:00:00.000Z",
    "publicUrl": "https://..."
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

### Error: "Failed to load pricing file from Supabase"

- Check that the bucket name is exactly `pricing-files`
- Verify the file is named `2026 Pricing.xlsx`
- Ensure environment variables are set correctly
- Check that the service role key has proper permissions

### Error: "Unauthorized"

- Verify your API key matches the `SUPABASE_UPLOAD_API_KEY` environment variable
- Check that the API key is being sent correctly in headers or query params
