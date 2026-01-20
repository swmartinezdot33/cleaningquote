import { NextRequest, NextResponse } from 'next/server';
import { storePricingFile } from '@/lib/kv';
import { invalidatePricingCache, loadPricingTable } from '@/lib/pricing/loadPricingTable';
import { getKV } from '@/lib/kv';
import * as XLSX from 'xlsx';

const PRICING_DATA_KEY = 'pricing:data:table';

/**
 * POST /api/admin/upload-pricing
 * 
 * Upload a new pricing Excel file to Vercel KV (Upstash Redis) storage
 * Also parses and saves the structured pricing data
 * 
 * Body: FormData with a file field named 'file'
 * 
 * Authentication: Send password in header 'x-admin-password'
 */
export async function POST(request: NextRequest) {
  try {
    // Check for password authentication
    const password = request.headers.get('x-admin-password');
    const requiredPassword = process.env.ADMIN_PASSWORD;
    
    if (requiredPassword && password !== requiredPassword) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing password.' },
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

    // Validate and parse Excel file
    let pricingTable;
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      if (!workbook.SheetNames.includes('Sheet1')) {
        return NextResponse.json(
          { error: 'Excel file must contain a sheet named "Sheet1"' },
          { status: 400 }
        );
      }

      // Parse the Excel file using the existing loadPricingTable logic
      // We'll parse it inline here to get the structured data
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      // Import parsing functions
      const { parsePriceRange } = await import('@/lib/pricing/loadPricingTable');
      
      // Parse the data (simplified - using the existing parser would be better)
      // For now, store the raw file and let the loader handle parsing
      pricingTable = null; // Will be parsed on first load
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Excel file. Could not parse the file.' },
        { status: 400 }
      );
    }

    // Upload raw file to Vercel KV (Upstash Redis)
    await storePricingFile(buffer);

    // Try to parse and save structured data if possible
    // The structured data will be generated on first quote calculation
    try {
      invalidatePricingCache();
      const parsedTable = await loadPricingTable();
      const kv = getKV();
      await kv.set(PRICING_DATA_KEY, parsedTable);
    } catch (parseError) {
      console.warn('Could not parse pricing table immediately:', parseError);
      // File is still stored, will be parsed on first use
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing file uploaded successfully to Vercel KV storage',
      size: buffer.length,
      uploadedAt: new Date().toISOString(),
      note: 'File will be parsed and structured data will be available shortly',
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
export async function GET(request: NextRequest) {
  try {
    // Check for password authentication
    const password = request.headers.get('x-admin-password');
    const requiredPassword = process.env.ADMIN_PASSWORD;
    
    if (requiredPassword && password !== requiredPassword) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing password.' },
        { status: 401 }
      );
    }

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
