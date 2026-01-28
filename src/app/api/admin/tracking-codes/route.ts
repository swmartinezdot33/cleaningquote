import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { requireAdminAuth } from '@/lib/security/auth';

const TRACKING_CODES_KEY = 'admin:tracking-codes';

interface TrackingCodes {
  customHeadCode?: string;
}

/**
 * GET /api/admin/tracking-codes
 * Retrieve stored tracking codes (custom head code only).
 */
export async function GET(request: NextRequest) {
  try {
    const trackingCodes = await kv.get<TrackingCodes>(TRACKING_CODES_KEY);
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

    const trackingCodes: TrackingCodes = {};
    if (customHeadCode?.trim()) trackingCodes.customHeadCode = customHeadCode.trim();

    await kv.set(TRACKING_CODES_KEY, trackingCodes);

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
