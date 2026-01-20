# Emergency Migration: Fix Survey Question Fields

Your survey questions are cached in Vercel KV. The old data might have incorrect field types. This migration fixes it.

## What's Fixed

- ✅ **squareFeet** - Now always select type with range options (500-1000, 1000-1500, etc.)
- ✅ **halfBaths** - Now select type with 0 as default option
- ✅ **sheddingPets** - Now select type with 0 as default option

## How to Run the Migration

### Option 1: Check Current Status
```bash
curl -X GET https://your-domain.com/api/admin/migration/reset-survey-questions
```

This shows you the current state of the cached fields.

### Option 2: Run Full Migration
```bash
curl -X POST https://your-domain.com/api/admin/migration/reset-survey-questions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

Replace `YOUR_ADMIN_TOKEN` with any Bearer token value (the endpoint just checks that a Bearer token is provided).

### Option 3: Just Clear Cache (Simple)
```bash
curl -X POST https://your-domain.com/api/admin/migration/clear-survey-cache \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

## After Running

1. **Hard refresh** your browser: 
   - Mac: `Cmd + Shift + R`
   - Windows: `Ctrl + Shift + R`

2. The form should now show:
   - Square footage as a dropdown (NOT a number input)
   - Half baths with 0 as the first option
   - Shedding pets with 0 as the first option

## Technical Details

The migration works by:
1. Deleting the old cached `survey:questions` key from Vercel KV
2. Storing corrected default questions with proper field types
3. Every GET request to `/api/survey-questions` applies mandatory fixes to ensure the fields stay correct

This prevents accidental changes from the admin survey builder from breaking the form.
