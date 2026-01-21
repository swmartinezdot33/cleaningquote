import { NextRequest, NextResponse } from 'next/server';
import { getServiceAreaPolygon, getServiceAreaNetworkLink } from '@/lib/kv';
import { pointInPolygon, PolygonCoordinates } from '@/lib/service-area/pointInPolygon';
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

    // Ensure polygon is closed (first point should equal last point)
    if (polygon.length > 0) {
      const firstPoint = polygon[0];
      const lastPoint = polygon[polygon.length - 1];
      const isClosed = firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1];
      
      if (!isClosed) {
        // Close the polygon by adding the first point at the end
        polygon = [...polygon, [firstPoint[0], firstPoint[1]]] as PolygonCoordinates;
        console.log('Polygon was not closed - added closing point');
      }
    }
    
    // Calculate bounding box for quick rejection
    const polygonBounds = polygon && polygon.length > 0 ? {
      minLat: Math.min(...polygon.map(p => p[0])),
      maxLat: Math.max(...polygon.map(p => p[0])),
      minLng: Math.min(...polygon.map(p => p[1])),
      maxLng: Math.max(...polygon.map(p => p[1])),
    } : null;
    
    // Quick bounds check - if point is clearly outside bounding box, skip expensive check
    let inServiceArea = false;
    if (polygonBounds) {
      const latWithinBounds = lat >= polygonBounds.minLat && lat <= polygonBounds.maxLat;
      const lngWithinBounds = lng >= polygonBounds.minLng && lng <= polygonBounds.maxLng;
      
      console.log('Service area check:', {
        coordinates: { lat, lng },
        polygonSource,
        polygonPointCount: polygon?.length || 0,
        polygonBounds,
        latWithinBounds,
        lngWithinBounds,
        polygonSample: polygon.slice(0, 3).map(p => ({ lat: p[0], lng: p[1] })), // First 3 points for debugging
      });
      
      // Only run point-in-polygon check if point is within bounding box
      if (latWithinBounds && lngWithinBounds) {
        inServiceArea = pointInPolygon({ lat, lng }, polygon);
        console.log('Point-in-polygon check result:', {
          inServiceArea,
          coordinates: { lat, lng },
        });
      } else {
        console.log('Point is outside bounding box - skipping point-in-polygon check');
        inServiceArea = false;
      }
    } else {
      inServiceArea = pointInPolygon({ lat, lng }, polygon);
    }
    
    console.log('Service area check result:', {
      inServiceArea,
      coordinates: { lat, lng },
      polygonSource,
      pointWithinBounds: polygonBounds ? {
        latWithin: lat >= polygonBounds.minLat && lat <= polygonBounds.maxLat,
        lngWithin: lng >= polygonBounds.minLng && lng <= polygonBounds.maxLng,
      } : null,
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
