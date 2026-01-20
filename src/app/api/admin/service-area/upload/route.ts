import { NextRequest, NextResponse } from 'next/server';
import { storeServiceAreaPolygon } from '@/lib/kv';
import { parseKML, isValidKML } from '@/lib/service-area/parseKML';

/**
 * POST /api/admin/service-area/upload
 * Upload and parse KML file for service area polygon
 * 
 * Request body:
 * {
 *   kmlContent: string (KML file content)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   polygons: number (number of polygons parsed),
 *   coordinates: number (total coordinates),
 *   message?: string,
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const password = request.headers.get('x-admin-password');
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { kmlContent } = body;

    if (!kmlContent || typeof kmlContent !== 'string') {
      return NextResponse.json(
        { error: 'KML content is required' },
        { status: 400 }
      );
    }

    // Validate KML format
    if (!isValidKML(kmlContent)) {
      return NextResponse.json(
        { error: 'Invalid KML file. Must contain valid KML polygon elements.' },
        { status: 400 }
      );
    }

    // Parse KML to extract polygon coordinates
    const result = parseKML(kmlContent);

    if (result.error || result.polygons.length === 0) {
      return NextResponse.json(
        {
          error: result.error || 'No valid polygons found in KML file',
        },
        { status: 400 }
      );
    }

    // Use the first polygon for service area
    const polygon = result.polygons[0];

    if (polygon.length < 3) {
      return NextResponse.json(
        { error: 'Polygon must have at least 3 coordinates' },
        { status: 400 }
      );
    }

    // Store polygon in KV
    await storeServiceAreaPolygon(polygon);

    return NextResponse.json(
      {
        success: true,
        polygons: result.polygons.length,
        coordinates: polygon.length,
        message: `Service area polygon uploaded successfully! Polygon has ${polygon.length} coordinates.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error uploading service area:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to upload service area',
      },
      { status: 500 }
    );
  }
}
