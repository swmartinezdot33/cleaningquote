import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';

interface GHLTag {
  id: string;
  name: string;
}

/**
 * GET /api/admin/ghl-tags
 * Fetch available tags from GHL for the current location
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const passwordHeader = request.headers.get('x-admin-password');
    
    if (!authHeader && !passwordHeader) {
      console.error('No authentication header provided');
      return NextResponse.json(
        { error: 'Unauthorized - missing authentication' },
        { status: 401 }
      );
    }

    const token = await getGHLToken();
    const locationId = await getGHLLocationId();

    if (!token) {
      console.error('GHL token not configured');
      return NextResponse.json(
        { error: 'GHL token not configured' },
        { status: 400 }
      );
    }

    if (!locationId) {
      console.error('Location ID not configured');
      return NextResponse.json(
        { error: 'Location ID not configured' },
        { status: 400 }
      );
    }

    console.log(`Fetching tags for location: ${locationId}`);

    // Fetch tags from GHL API v2
    // GHL uses /locations/{locationId}/tags endpoint
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/tags`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28', // GHL API v2
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GHL tags error (${response.status}):`, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid GHL token or missing locations.readonly scope' },
          { status: 401 }
        );
      }

      if (response.status === 403) {
        return NextResponse.json(
          { error: 'Permission denied. Ensure you have locations.readonly scope enabled.' },
          { status: 403 }
        );
      }

      if (response.status === 404) {
        console.log('Tags endpoint returned 404 - trying alternative endpoint');
        // Try alternative endpoint
        try {
          const altResponse = await fetch(
            `https://services.leadconnectorhq.com/locations/${locationId}/tags`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28',
              },
            }
          );
          
          if (altResponse.ok) {
            const data = await altResponse.json();
            let tags: any[] = [];
            if (data.tags && Array.isArray(data.tags)) {
              tags = data.tags.map((tag: any) => ({
                id: tag.id || tag.name,
                name: tag.name,
              }));
            }
            return NextResponse.json({ tags }, { status: 200 });
          }
        } catch (e) {
          console.error('Alternative tags endpoint failed:', e);
        }
        
        return NextResponse.json(
          { tags: [], message: 'No tags found. This may be normal if tags are not configured in your location.' },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: `Failed to fetch tags from GHL: ${response.status}`, tags: [] },
        { status: 200 }
      );
    }

    const data = await response.json();

    // GHL API returns tags in different structures, handle multiple
    let tags: GHLTag[] = [];

    if (data.tags && Array.isArray(data.tags)) {
      tags = data.tags.map((tag: any) => ({
        id: tag.id || tag.name,
        name: tag.name,
      }));
    } else if (data.data && Array.isArray(data.data)) {
      tags = data.data.map((tag: any) => ({
        id: tag.id || tag.name,
        name: tag.name,
      }));
    } else if (Array.isArray(data)) {
      tags = data.map((tag: any) => ({
        id: tag.id || tag.name,
        name: tag.name,
      }));
    }

    return NextResponse.json(
      { tags },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching GHL tags:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch tags',
      },
      { status: 500 }
    );
  }
}
