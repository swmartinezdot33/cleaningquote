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

    // Try to get polygons: first from NetworkLink if available, then from stored polygon
    let polygons: PolygonCoordinates[] = [];
    let polygonSource = 'none';

    // Check if we have a NetworkLink configured
    const networkLink = await getServiceAreaNetworkLink();
    if (networkLink) {
      try {
        const result = await fetchAndParseNetworkKML(networkLink);
        if (result.polygons && result.polygons.length > 0) {
          polygons = result.polygons;
          polygonSource = 'network';
          console.log(`[service-area/check] Found ${polygons.length} polygon(s) from NetworkLink`);
        }
      } catch (error) {
        console.error('Error fetching NetworkLink KML:', error);
        // Fall back to stored polygon
      }
    }

    // Fall back to stored polygon if NetworkLink didn't work
    if (polygons.length === 0) {
      const storedPolygon = await getServiceAreaPolygon();
      if (storedPolygon && storedPolygon.length > 0) {
        polygons = [storedPolygon];
        polygonSource = 'stored';
        console.log(`[service-area/check] Using stored polygon with ${storedPolygon.length} points`);
      }
    }

    if (polygons.length === 0 || polygons.every(p => p.length === 0)) {
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

    // Ensure all polygons are closed (first point should equal last point)
    const closedPolygons = polygons.map((polygon) => {
      if (polygon.length === 0) return polygon;
      
      const firstPoint = polygon[0];
      const lastPoint = polygon[polygon.length - 1];
      const isClosed = firstPoint[0] === lastPoint[0] && firstPoint[1] === lastPoint[1];
      
      if (!isClosed) {
        // Close the polygon by adding the first point at the end
        return [...polygon, [firstPoint[0], firstPoint[1]]] as PolygonCoordinates;
      }
      return polygon;
    });
    
    // Calculate combined bounding box for all polygons (for quick rejection)
    const allPoints = closedPolygons.flat();
    const polygonBounds = allPoints.length > 0 ? {
      minLat: Math.min(...allPoints.map(p => p[0])),
      maxLat: Math.max(...allPoints.map(p => p[0])),
      minLng: Math.min(...allPoints.map(p => p[1])),
      maxLng: Math.max(...allPoints.map(p => p[1])),
    } : null;
    
    // Quick bounds check - if point is clearly outside combined bounding box, skip expensive checks
    let inServiceArea = false;
    if (polygonBounds) {
      const latWithinBounds = lat >= polygonBounds.minLat && lat <= polygonBounds.maxLat;
      const lngWithinBounds = lng >= polygonBounds.minLng && lng <= polygonBounds.maxLng;
      
      console.log('Service area check:', {
        coordinates: { lat, lng },
        polygonSource,
        polygonCount: closedPolygons.length,
        totalPolygonPoints: allPoints.length,
        polygonBounds,
        latWithinBounds,
        lngWithinBounds,
      });
      
      // Only run point-in-polygon checks if point is within combined bounding box
      if (latWithinBounds && lngWithinBounds) {
        // Check the point against ALL polygons - return true if it's in ANY polygon
        console.log(`Running point-in-polygon check against ${closedPolygons.length} polygon(s)...`);
        
        for (let i = 0; i < closedPolygons.length; i++) {
          const polygon = closedPolygons[i];
          if (polygon.length < 3) continue; // Skip invalid polygons
          
          const isInThisPolygon = pointInPolygon({ lat, lng }, polygon);
          
          if (isInThisPolygon) {
            console.log(`Point is inside polygon ${i + 1} of ${closedPolygons.length}`);
            inServiceArea = true;
            break; // Found in at least one polygon, no need to check others
          }
        }
        
        if (!inServiceArea) {
          console.log(`Point is not inside any of the ${closedPolygons.length} polygon(s)`);
        }
      } else {
        console.log('Point is outside combined bounding box - skipping point-in-polygon checks', {
          point: { lat, lng },
          bounds: polygonBounds,
          latWithinBounds,
          lngWithinBounds,
        });
        inServiceArea = false;
      }
    } else {
      // Fallback: check against all polygons even without bounds
      for (const polygon of closedPolygons) {
        if (polygon.length >= 3 && pointInPolygon({ lat, lng }, polygon)) {
          inServiceArea = true;
          break;
        }
      }
    }
    
    console.log('Service area check result:', {
      inServiceArea,
      coordinates: { lat, lng },
      polygonSource,
      polygonCount: closedPolygons.length,
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
