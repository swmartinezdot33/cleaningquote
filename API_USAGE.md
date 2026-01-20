# Pricing File Upload API

## Endpoint

**POST** `/api/admin/upload-pricing`

Upload a new pricing Excel file to Vercel KV (Upstash Redis) storage.

## Authentication

Include your API key in the request:

- **Header:** `x-api-key: your_api_key_here`
- **Query Parameter:** `?apiKey=your_api_key_here`

The API key should match the `SUPABASE_UPLOAD_API_KEY` environment variable set in Vercel (you can rename this to `UPLOAD_API_KEY` if you prefer).

## Request Format

Send a `multipart/form-data` POST request with:
- **Field name:** `file`
- **File type:** `.xlsx` or `.xls` Excel file
- **File name:** Should be `2026 Pricing.xlsx` (recommended, but any name works)

## Examples

### Using cURL

```bash
curl -X POST \
  https://quote.raleighcleaningcompany.com/api/admin/upload-pricing \
  -H "x-api-key: your_api_key_here" \
  -F "file=@/path/to/2026 Pricing.xlsx"
```

### Using JavaScript/Fetch

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]); // fileInput is an <input type="file"> element

const response = await fetch('/api/admin/upload-pricing?apiKey=your_api_key_here', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result);
```

### Using Node.js

```javascript
const FormData = require('form-data');
const fs = require('fs');
const fetch = require('node-fetch');

const formData = new FormData();
formData.append('file', fs.createReadStream('./2026 Pricing.xlsx'));

const response = await fetch('https://quote.raleighcleaningcompany.com/api/admin/upload-pricing?apiKey=your_api_key', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result);
```

## Response

### Success (200 OK)

```json
{
  "success": true,
  "message": "Pricing file uploaded successfully",
  "file": "2026 Pricing.xlsx",
  "size": 11264,
  "uploadedAt": "2024-01-19T12:00:00.000Z"
}
```

### Error Responses

**401 Unauthorized:**
```json
{
  "error": "Unauthorized. Invalid or missing API key."
}
```

**400 Bad Request:**
```json
{
  "error": "No file provided. Please include a file in the \"file\" field."
}
```
or
```json
{
  "error": "Invalid file type. Only Excel files (.xlsx, .xls) are allowed."
}
```
or
```json
{
  "error": "Excel file must contain a sheet named \"Sheet1\""
}
```

**500 Internal Server Error:**
```json
{
  "error": "Failed to upload file: ...",
  "details": "Detailed error message (only in development)"
}
```

## Check Current File

**GET** `/api/admin/upload-pricing?apiKey=your_api_key`

Get information about the currently stored pricing file:

```json
{
  "exists": true,
  "file": {
    "name": "2026 Pricing.xlsx",
    "size": 11264,
    "updatedAt": "2024-01-19T12:00:00.000Z",
    "publicUrl": "https://your-project.supabase.co/storage/v1/object/public/pricing-files/2026%20Pricing.xlsx"
  }
}
```

## Notes

- The uploaded file **replaces** any existing pricing file
- The cache is automatically cleared after upload, so the new pricing will be used on the next quote calculation
- Make sure your Excel file has the correct format (Sheet1 with the expected columns)
- File validation happens server-side to ensure the file is valid before uploading
