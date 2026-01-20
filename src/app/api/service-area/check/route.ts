import { NextRequest, NextResponse } from 'next/server';
import { getServiceAreaPolygon } from '@/lib/kv';
import { pointInPolygon } from '@/lib/service-area/pointInPolygon';

/**
 * POST /api/service-area/check
 * Check if an address is within the service area
 * 
 * Request body:
 * {
 *   lat: number,
 *   lng: number
 * }
 * 
 * Response:
 * {
 *   inServiceArea: boolean,
 *   message?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lat, lng } = body;

    // Validate coordinates
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates. Both lat and lng must be numbers.' },
        { status: 400 }
      );
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: 'Coordinates out of valid range.' },
        { status: 400 }
      );
    }

    // Get service area polygon from storage
    const polygon = await getServiceAreaPolygon();

    if (!polygon || polygon.length === 0) {
      return NextResponse.json(
        {
          inServiceArea: false,
          message: 'Service area not configured. Please contact support.',
        },
        { status: 200 }
      );
    }

    // Check if point is in polygon
    const inServiceArea = pointInPolygon({ lat, lng }, polygon);

    return NextResponse.json(
      {
        inServiceArea,
        message: inServiceArea
          ? 'Great! You are within our service area.'
          : 'Sorry, this address is outside our service area.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error checking service area:', error);
    return NextResponse.json(
      { error: 'Failed to check service area' },
      { status: 500 }
    );
  }
}
