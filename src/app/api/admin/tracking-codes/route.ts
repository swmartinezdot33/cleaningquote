import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { requireAdminAuth } from '@/lib/security/auth';

const TRACKING_CODES_KEY = 'admin:tracking-codes';

interface TrackingCodes {
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  facebookPixelId?: string;
  metaPixelId?: string;
  customHeadCode?: string;
  googleAdsConversionId?: string;
  googleAdsConversionLabel?: string;
}

/**
 * GET /api/admin/tracking-codes
 * Retrieve stored tracking codes
 * Note: This endpoint is public (no auth required) for use in public pages
 */
export async function GET(request: NextRequest) {
  try {
    // Allow public access - tracking codes are needed for public pages
    // No authentication required for GET requests

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
 * Save tracking codes
 * Requires admin authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Secure authentication (supports both JWT and legacy password)
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { googleAnalyticsId, googleTagManagerId, facebookPixelId, metaPixelId, customHeadCode, googleAdsConversionId, googleAdsConversionLabel } = body;

    // Build tracking codes object (only include non-empty values)
    const trackingCodes: TrackingCodes = {};

    if (googleAnalyticsId?.trim()) trackingCodes.googleAnalyticsId = googleAnalyticsId.trim();
    if (googleTagManagerId?.trim()) trackingCodes.googleTagManagerId = googleTagManagerId.trim();
    if (facebookPixelId?.trim()) trackingCodes.facebookPixelId = facebookPixelId.trim();
    if (metaPixelId?.trim()) trackingCodes.metaPixelId = metaPixelId.trim();
    if (customHeadCode?.trim()) trackingCodes.customHeadCode = customHeadCode.trim();
    if (googleAdsConversionId?.trim()) trackingCodes.googleAdsConversionId = googleAdsConversionId.trim();
    if (googleAdsConversionLabel?.trim()) trackingCodes.googleAdsConversionLabel = googleAdsConversionLabel.trim();

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
