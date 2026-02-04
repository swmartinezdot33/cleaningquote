import { NextRequest, NextResponse } from 'next/server';
import { generatePricingTemplateBuffer } from '@/lib/pricing/generatePricingTemplate';
import { requireAdminAuth } from '@/lib/security/auth';

/**
 * GET /api/admin/download-template
 *
 * Returns a generated pricing Excel template (no file on disk required).
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const buffer = generatePricingTemplateBuffer();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Pricing_Template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Template download error:', error);
    return NextResponse.json(
      {
        error: 'Failed to download template',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
