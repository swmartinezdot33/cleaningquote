import { NextRequest, NextResponse } from 'next/server';
import { storePricingFile, setPricingTable } from '@/lib/kv';
import { invalidatePricingCache, loadPricingTable } from '@/lib/pricing/loadPricingTable';
import { requireAdminAuth } from '@/lib/security/auth';
import * as XLSX from 'xlsx';

/**
 * POST /api/admin/upload-pricing
 * 
 * Upload a new pricing Excel file to Vercel KV (Upstash Redis) storage
 * Also parses and saves the structured pricing data
 * 
 * Body: FormData with a file field named 'file'
 */
export async function POST(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

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

    // Try to parse and save structured data immediately
    let parseSuccess = false;
    let parseError = null;
    let parseErrorDetails = null;
    try {
      invalidatePricingCache();
      const parsedTable = await loadPricingTable();
      await setPricingTable(parsedTable);
      parseSuccess = true;
    } catch (error) {
      parseError = error instanceof Error ? error.message : 'Unknown error';
      parseErrorDetails = error instanceof Error && error.stack ? error.stack.split('\n').slice(0, 3).join('\n') : null;
      console.error('Could not parse pricing table immediately:', error);
      
      // Provide more helpful error messages for common issues
      if (parseError.includes('Sheet') && parseError.includes('not found')) {
        parseError = `Sheet not found: The Excel file must contain a sheet named "Sheet1". ${parseError}`;
      } else if (parseError.includes('No valid pricing rows')) {
        parseError = `No valid pricing rows found. Please ensure your file has: a header row with columns for "SqFt Range", "Weekly", "Bi-Weekly", "4 Week", "General", and "Deep"; and at least one data row with valid price ranges in format "$100-$200". ${parseError}`;
      } else if (parseError.includes('KV storage is not configured')) {
        parseError = `KV storage is not configured. This is required for production. For local development, you can use the manual pricing builder. ${parseError}`;
      }
      
      // File is still stored, will be parsed on first use
    }

    if (parseSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Pricing file uploaded and parsed successfully',
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        parsed: true,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'File uploaded, but parsing failed. Please check the file format and try again.',
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        parsed: false,
        error: parseError || 'Parsing failed',
        errorDetails: parseErrorDetails,
        note: 'Tips: Ensure your Excel file has a sheet named "Sheet1", a header row with column names, and price ranges in format "$100-$200". Download the template for the correct format.',
      }, { status: 200 });
    }
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
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

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
