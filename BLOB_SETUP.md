# Survey option image uploads (Supabase)

Survey Builder image uploads **use Supabase Storage**, not Vercel Blob.

- **Setup:** Create a public bucket named `survey-option-images` in your Supabase project.  
  See **[docs/SUPABASE_STORAGE_SURVEY_IMAGES.md](docs/SUPABASE_STORAGE_SURVEY_IMAGES.md)** for steps.
- No extra env vars: the same `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` used for the app are used for uploads.
