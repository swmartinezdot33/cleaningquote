import { NextRequest, NextResponse } from 'next/server';
import { generatePricingTemplateBuffer } from '@/lib/pricing/generatePricingTemplate';

/**
 * GET /api/admin/download-template
 *
 * Returns a generated pricing Excel template (no file on disk required).
 *
 * Authentication: Send password in header 'x-admin-password'
 */
export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password');
    const requiredPassword = process.env.ADMIN_PASSWORD;

    if (requiredPassword && password !== requiredPassword) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid or missing password.' },
        { status: 401 }
      );
    }

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
