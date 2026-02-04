import { NextRequest, NextResponse } from 'next/server';
import { getServiceAreaPolygon, getServiceAreaNetworkLink } from '@/lib/kv';
import { requireAdminAuth } from '@/lib/security/auth';

// Force dynamic rendering - this route uses request headers
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/service-area/status
 * Get current service area configuration status
 * 
 * Response:
 * {
 *   type: 'none' | 'direct' | 'network',
 *   networkLink?: string,
 *   polygonCount?: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    // Get network link first
    const networkLink = await getServiceAreaNetworkLink();
    if (networkLink) {
      // Try to get polygon to count coordinates
      const polygon = await getServiceAreaPolygon();
      return NextResponse.json(
        {
          type: 'network',
          networkLink,
          polygonCount: polygon?.length || 0,
        },
        { status: 200 }
      );
    }

    // Get stored polygon
    const polygon = await getServiceAreaPolygon();
    if (polygon && polygon.length > 0) {
      return NextResponse.json(
        {
          type: 'direct',
          polygonCount: polygon.length,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        type: 'none',
        polygonCount: 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting service area status:', error);
    return NextResponse.json(
      { error: 'Failed to get service area status' },
      { status: 500 }
    );
  }
}
