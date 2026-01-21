import { NextRequest, NextResponse } from 'next/server';
import { getServiceAreaPolygon, getServiceAreaNetworkLink } from '@/lib/kv';
import { pointInPolygon } from '@/lib/service-area/pointInPolygon';
import { fetchAndParseNetworkKML } from '@/lib/service-area/fetchNetworkKML';

/**
 * POST /api/service-area/check
 * Check if an address is within the service area
 * 
 * Automatically uses NetworkLink URL if available, otherwise falls back to stored polygon.
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

    // Try to get polygon: first from NetworkLink if available, then from stored polygon
    let polygon = null;
    let polygonSource = 'none';

    // Check if we have a NetworkLink configured
    const networkLink = await getServiceAreaNetworkLink();
    if (networkLink) {
      try {
        const result = await fetchAndParseNetworkKML(networkLink);
        if (result.polygons && result.polygons.length > 0) {
          polygon = result.polygons[0];
          polygonSource = 'network';
        }
      } catch (error) {
        console.error('Error fetching NetworkLink KML:', error);
        // Fall back to stored polygon
      }
    }

    // Fall back to stored polygon if NetworkLink didn't work
    if (!polygon) {
      polygon = await getServiceAreaPolygon();
      if (polygon) {
        polygonSource = 'stored';
      }
    }

    if (!polygon || polygon.length === 0) {
      // If no service area is configured, allow all addresses (return true)
      // This prevents blocking all addresses when service area isn't set up yet
      console.log('No service area configured - allowing all addresses');
      return NextResponse.json(
        {
          inServiceArea: true,
          message: 'Service area check skipped - no service area configured.',
        },
        { status: 200 }
      );
    }

    // Check if point is in polygon
    console.log('Service area check:', {
      coordinates: { lat, lng },
      polygonSource,
      polygonPointCount: polygon?.length || 0,
    });
    
    const inServiceArea = pointInPolygon({ lat, lng }, polygon);
    
    console.log('Service area check result:', {
      inServiceArea,
      coordinates: { lat, lng },
      polygonSource,
    });

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
