# Survey option images (Supabase Storage)

Survey Builder can attach images to dropdown options (e.g. condition of home). Uploads are stored in **Supabase Storage**, keyed by tool, so they’re already in the same place as your config and quotes.

## One-time setup

1. **Create a public bucket**
   - Supabase Dashboard → **Storage** → **New bucket**
   - Name: **`survey-option-images`** (must match exactly)
   - Enable **Public bucket** so option images can be shown in the quote form
   - Create

2. **Env**
   - You already use `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for the app. No extra env vars are needed for uploads.

Uploads use the path `{toolId}/{timestamp}-{random}.{ext}`, so each tool’s images stay grouped.

## Optional: RLS

If you prefer the bucket to be private, you’d need to switch the app to use **signed URLs** (short-lived) instead of public URLs. The current implementation uses a public bucket for simplicity.
