import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, isSupabaseConfigured } from '@/lib/supabase/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { validateFileUpload } from '@/lib/security/validation';

export const dynamic = 'force-dynamic';

const BUCKET = 'cleaningquote-images';
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** POST - Upload an image for a survey option (e.g. condition of home). Stored in Supabase Storage, keyed by tool. Returns public URL. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: 'Image upload is not configured.',
        hint: 'Supabase is required. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Create a public Storage bucket named "cleaningquote-images" in your Supabase project. See docs/SUPABASE_STORAGE_SURVEY_IMAGES.md.',
      },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Use form field "file".' },
        { status: 400 }
      );
    }

    const validation = validateFileUpload(file, {
      maxSize: MAX_SIZE,
      allowedTypes: ALLOWED_TYPES,
    });
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error ?? 'Invalid file' },
        { status: 400 }
      );
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
    const path = `${toolId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

    const supabase = createSupabaseServer();
    const arrayBuffer = await file.arrayBuffer();

    let uploadError: { message?: string } | null = null;
    let uploadAttempt = 0;
    const maxAttempts = 2;

    while (uploadAttempt < maxAttempts) {
      const result = await supabase.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, {
          contentType: file.type || `image/${safeExt}`,
          upsert: false,
        });
      uploadError = result.error;
      if (!uploadError) break;

      const isBucketMissing =
        uploadError.message?.includes('Bucket not found') ||
        uploadError.message?.toLowerCase().includes('bucket') ||
        uploadError.message?.includes('not found');
      if (isBucketMissing && uploadAttempt === 0) {
        const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: '2MB',
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        });
        if (createErr) {
          console.error('Survey option image: createBucket failed:', createErr);
          return NextResponse.json(
            {
              error: 'Storage bucket not found.',
              hint: `Create a public bucket named "${BUCKET}" in Supabase: Dashboard → Storage → New bucket → name "${BUCKET}", set Public.`,
            },
            { status: 503 }
          );
        }
        uploadAttempt++;
        continue;
      }
      break;
    }

    if (uploadError) {
      console.error('Survey option image upload (Supabase):', uploadError);
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.toLowerCase().includes('bucket')) {
        return NextResponse.json(
          {
            error: 'Storage bucket not found.',
            hint: `Create a public bucket named "${BUCKET}" in Supabase: Dashboard → Storage → New bucket → name "${BUCKET}", set Public.`,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: uploadError.message || 'Upload failed' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = urlData?.publicUrl?.trim?.();
    if (!url) {
      return NextResponse.json(
        { error: 'Upload succeeded but could not get public URL. Try again.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ url });
  } catch (err) {
    console.error('Survey option image upload error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
