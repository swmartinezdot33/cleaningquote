import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { invalidatePricingCache } from '@/lib/pricing/loadPricingTable';
import * as XLSX from 'xlsx';

const PRICING_BUCKET = 'pricing-files';
const PRICING_FILE_NAME = '2026 Pricing.xlsx';

/**
 * POST /api/admin/upload-pricing
 * 
 * Upload a new pricing Excel file to Supabase storage
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
    const requiredApiKey = process.env.SUPABASE_UPLOAD_API_KEY;
    
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

    // Upload to Supabase Storage
    const supabaseAdmin = getSupabaseAdmin();
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(PRICING_BUCKET)
      .upload(PRICING_FILE_NAME, buffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true, // Overwrite if exists
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Clear cached pricing table to force reload on next request
    invalidatePricingCache();

    return NextResponse.json({
      success: true,
      message: 'Pricing file uploaded successfully',
      file: uploadData.path,
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
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.storage
      .from(PRICING_BUCKET)
      .list('', {
        search: PRICING_FILE_NAME,
      });

    if (error) {
      return NextResponse.json(
        { error: `Failed to check file: ${error.message}` },
        { status: 500 }
      );
    }

    const file = data?.find(f => f.name === PRICING_FILE_NAME);

    if (!file) {
      return NextResponse.json({
        exists: false,
        message: 'No pricing file found',
      });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(PRICING_BUCKET)
      .getPublicUrl(PRICING_FILE_NAME);

    return NextResponse.json({
      exists: true,
      file: {
        name: file.name,
        size: file.metadata?.size || 0,
        updatedAt: file.updated_at,
        publicUrl: urlData.publicUrl,
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
