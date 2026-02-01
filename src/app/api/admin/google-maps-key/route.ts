import { NextRequest, NextResponse } from 'next/server';
import { getGoogleMapsKey, setGoogleMapsKey } from '@/lib/kv';

/**
 * GET /api/admin/google-maps-key
 * Retrieve the stored Google Maps API key (masked)
 */
export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password');
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const apiKey = await getGoogleMapsKey();

    const maskedKey = apiKey ? apiKey.substring(0, 7) + '*'.repeat(Math.max(0, apiKey.length - 10)) + apiKey.substring(apiKey.length - 3) : '';

    return NextResponse.json({
      exists: !!apiKey,
      maskedKey,
    });
  } catch (error) {
    console.error('Error getting Google Maps API key:', error);
    return NextResponse.json(
      { error: 'Failed to get API key' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/google-maps-key
 * Save the Google Maps API key
 */
export async function POST(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password');
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'API key is required' },
        { status: 400 }
      );
    }

    if (apiKey.length < 30) {
      return NextResponse.json(
        { error: 'API key appears to be invalid (too short)' },
        { status: 400 }
      );
    }

    await setGoogleMapsKey(apiKey);

    return NextResponse.json({
      success: true,
      message: 'Google Maps API key saved successfully',
    });
  } catch (error) {
    console.error('Error saving Google Maps API key:', error);
    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/google-maps-key
 * Remove the stored Google Maps API key
 */
export async function DELETE(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password');
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await setGoogleMapsKey(null);

    return NextResponse.json({
      success: true,
      message: 'Google Maps API key removed',
    });
  } catch (error) {
    console.error('Error deleting Google Maps API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
