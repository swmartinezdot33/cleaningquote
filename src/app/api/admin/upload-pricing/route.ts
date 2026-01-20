import { NextRequest, NextResponse } from 'next/server';
import { storePricingFile } from '@/lib/kv';
import { invalidatePricingCache } from '@/lib/pricing/loadPricingTable';
import * as XLSX from 'xlsx';

/**
 * POST /api/admin/upload-pricing
 * 
 * Upload a new pricing Excel file to Vercel KV (Upstash Redis) storage
 * 
 * Body: FormData with a file field named 'file'
 * 
 * Optional query params:
 * - apiKey: Authentication key (set in SUPABASE_UPLOAD_API_KEY env var)
 */
export async function POST(request: NextRequest) {
  try {
    // Check for API key authentication (optional but recommended)
    const apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('apiKey');
    const requiredApiKey = process.env.SUPABASE_UPLOAD_API_KEY; // Reusing same env var name for consistency
    
    if (requiredApiKey && apiKey !== requiredApiKey) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing API key.' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please include a file in the "file" field.' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed.' },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer then to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate Excel file by trying to read it
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      if (!workbook.SheetNames.includes('Sheet1')) {
        return NextResponse.json(
          { error: 'Excel file must contain a sheet named "Sheet1"' },
          { status: 400 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Excel file. Could not parse the file.' },
        { status: 400 }
      );
    }

    // Upload to Vercel KV (Upstash Redis)
    await storePricingFile(buffer);

    // Clear cached pricing table to force reload on next request
    invalidatePricingCache();

    return NextResponse.json({
      success: true,
      message: 'Pricing file uploaded successfully to Vercel KV storage',
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/upload-pricing
 * 
 * Get information about the current pricing file
 */
export async function GET() {
  try {
    const { getPricingFileMetadata, pricingFileExists } = await import('@/lib/kv');
    
    const exists = await pricingFileExists();

    if (!exists) {
      return NextResponse.json({
        exists: false,
        message: 'No pricing file found in KV storage',
      });
    }

    const metadata = await getPricingFileMetadata() as { size?: number; uploadedAt?: string; contentType?: string } | null;

    return NextResponse.json({
      exists: true,
      file: {
        name: '2026 Pricing.xlsx',
        size: metadata?.size || 0,
        uploadedAt: metadata?.uploadedAt || null,
        contentType: metadata?.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (error) {
    console.error('Get file info error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get file information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
