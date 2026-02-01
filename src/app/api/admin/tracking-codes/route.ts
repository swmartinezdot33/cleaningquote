import { NextRequest, NextResponse } from 'next/server';
import { getTrackingCodes, setTrackingCodes } from '@/lib/kv';
import { requireAdminAuth } from '@/lib/security/auth';

/**
 * GET /api/admin/tracking-codes
 * Retrieve stored tracking codes (custom head code only).
 */
export async function GET(request: NextRequest) {
  try {
    const trackingCodes = await getTrackingCodes();
    return NextResponse.json({
      trackingCodes: trackingCodes || {},
    });
  } catch (error) {
    console.error('Error getting tracking codes:', error);
    return NextResponse.json(
      { error: 'Failed to get tracking codes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/tracking-codes
 * Save tracking codes (custom head code only). Loads on quote summary page only.
 */
export async function POST(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const customHeadCode = body.customHeadCode;

    const trackingCodes: { customHeadCode?: string } = {};
    if (customHeadCode?.trim()) trackingCodes.customHeadCode = customHeadCode.trim();

    await setTrackingCodes(trackingCodes);

    return NextResponse.json({
      success: true,
      message: 'Tracking codes saved successfully',
    });
  } catch (error) {
    console.error('Error saving tracking codes:', error);
    return NextResponse.json(
      { error: 'Failed to save tracking codes' },
      { status: 500 }
    );
  }
}
