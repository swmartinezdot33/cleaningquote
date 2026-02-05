import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { validateFileUpload } from '@/lib/security/validation';

export const dynamic = 'force-dynamic';

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** POST - Upload an image for a survey option (e.g. condition of home). Returns public URL. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { error: 'Image upload is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel (or use image URL instead).' },
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
    const filename = `survey-options/${toolId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;

    const blob = await put(filename, file, {
      access: 'public',
      token,
    });

    const url = blob?.url?.trim?.();
    if (!url) {
      console.error('Vercel Blob put succeeded but returned no url:', blob);
      return NextResponse.json(
        { error: 'Upload succeeded but no URL was returned. Try again.' },
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
