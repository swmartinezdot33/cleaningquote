import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getKV, toolKey, storePricingFile } from '@/lib/kv';
import { invalidatePricingCache, loadPricingTable } from '@/lib/pricing/loadPricingTable';

export const dynamic = 'force-dynamic';

const PRICING_DATA_KEY = 'pricing:data:table';

/** POST - Upload pricing Excel file for this tool */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Include a file in the "file" field.' },
        { status: 400 }
      );
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only Excel files (.xlsx, .xls) are allowed.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await storePricingFile(buffer, toolId);

    let parseSuccess = false;
    let parseError: string | null = null;
    let parseErrorDetails: string | null = null;
    try {
      invalidatePricingCache(toolId);
      const parsedTable = await loadPricingTable(toolId);
      const kv = getKV();
      await kv.set(toolKey(toolId, PRICING_DATA_KEY), parsedTable);
      parseSuccess = true;
    } catch (err) {
      parseError = err instanceof Error ? err.message : 'Unknown error';
      parseErrorDetails =
        err instanceof Error && err.stack ? err.stack.split('\n').slice(0, 3).join('\n') : null;
      console.error('Could not parse pricing table for tool:', toolId, err);
    }

    if (parseSuccess) {
      return NextResponse.json({
        success: true,
        message: 'Pricing file uploaded and parsed successfully',
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        parsed: true,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'File uploaded, but parsing failed. Check the file format.',
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        parsed: false,
        error: parseError ?? 'Parsing failed',
        errorDetails: parseErrorDetails,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Dashboard upload-pricing:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process upload' },
      { status: 500 }
    );
  }
}

/** GET - Check if a pricing file exists for this tool */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const { getPricingFileMetadata, pricingFileExists } = await import('@/lib/kv');
    const exists = await pricingFileExists(toolId);

    if (!exists) {
      return NextResponse.json({ exists: false, message: 'No pricing file found.' });
    }

    const metadata = (await getPricingFileMetadata(toolId)) as
      | { size?: number; uploadedAt?: string; contentType?: string }
      | null;

    return NextResponse.json({
      exists: true,
      file: {
        name: 'Pricing.xlsx',
        size: metadata?.size ?? 0,
        uploadedAt: metadata?.uploadedAt ?? null,
        contentType:
          metadata?.contentType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });
  } catch (err) {
    console.error('GET dashboard upload-pricing:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get file info' },
      { status: 500 }
    );
  }
}
