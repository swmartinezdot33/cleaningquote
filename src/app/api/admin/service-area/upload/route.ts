import { NextRequest, NextResponse } from 'next/server';
import { parseKML } from '@/lib/service-area/parseKML';
import { storeServiceAreaPolygon, storeServiceAreaNetworkLink, deleteServiceAreaNetworkLink } from '@/lib/kv';
import { fetchAndParseNetworkKML, clearKMLCacheForURL } from '@/lib/service-area/fetchNetworkKML';
import { requireAdminAuth } from '@/lib/security/auth';

/**
 * POST /api/admin/service-area/upload
 * Upload a service area KML file or NetworkLink reference
 * 
 * Request body:
 * {
 *   kmlContent: string,
 *   password?: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   type?: 'direct' | 'network',
 *   polygonCount?: number,
 *   networkLink?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { kmlContent } = body;

    if (!kmlContent || typeof kmlContent !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid KML content' },
        { status: 400 }
      );
    }

    // Parse the KML
    const parsed = parseKML(kmlContent);

    // Handle error during parsing
    if (parsed.error) {
      return NextResponse.json(
        { error: parsed.error },
        { status: 400 }
      );
    }

    // Case 1: NetworkLink found - store the URL reference
    if (parsed.networkLink) {
      try {
        // Validate the URL is reachable and contains valid KML
        const validation = await fetchAndParseNetworkKML(parsed.networkLink);
        
        if (validation.error) {
          return NextResponse.json(
            { error: `Failed to validate NetworkLink: ${validation.error}` },
            { status: 400 }
          );
        }

        if (!validation.polygons || validation.polygons.length === 0) {
          return NextResponse.json(
            { error: 'No polygon data found at the NetworkLink URL' },
            { status: 400 }
          );
        }

        // Store the network link URL
        await storeServiceAreaNetworkLink(parsed.networkLink);

        // Also store the current polygons as a fallback
        if (validation.polygons.length > 0) {
          await storeServiceAreaPolygon(validation.polygons[0]);
        }

        return NextResponse.json(
          {
            success: true,
            message: `NetworkLink stored successfully! The system will automatically fetch and update the polygon data from the provided URL. Current polygon has ${validation.polygons[0]?.length || 0} coordinates.`,
            type: 'network',
            networkLink: parsed.networkLink,
            polygonCount: validation.polygons[0]?.length || 0,
          },
          { status: 200 }
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
          { error: `Failed to process NetworkLink: ${errorMsg}` },
          { status: 400 }
        );
      }
    }

    // Case 2: Direct polygon data found
    if (parsed.polygons && parsed.polygons.length > 0) {
      // Store the first polygon (can extend to support multiple polygons if needed)
      const polygon = parsed.polygons[0];
      
      await storeServiceAreaPolygon(polygon);
      
      // Clear any existing network link
      try {
        await deleteServiceAreaNetworkLink();
      } catch {
        // Ignore if there was no network link stored
      }

      return NextResponse.json(
        {
          success: true,
          message: `Service area polygon uploaded successfully with ${polygon.length} coordinates!`,
          type: 'direct',
          polygonCount: polygon.length,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'No polygon data or NetworkLink found in KML file' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error uploading service area:', error);
    return NextResponse.json(
      { error: `Failed to upload service area: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
