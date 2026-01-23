import { NextRequest, NextResponse } from 'next/server';
import { getServiceAreaPolygon, getServiceAreaNetworkLink } from '@/lib/kv';

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
    // Check admin password
    const password = request.headers.get('x-admin-password');
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
