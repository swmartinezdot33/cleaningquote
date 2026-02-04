import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import { requireAdminAuth } from '@/lib/security/auth';

// Force dynamic rendering - this route uses request headers
export const dynamic = 'force-dynamic';

/**
 * GET - Fetch users/team members from GHL
 */
export async function GET(request: NextRequest) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) return authResponse;

  try {
    const token = await getGHLToken();
    
    if (!token) {
      return NextResponse.json(
        { error: 'GHL token not configured' },
        { status: 400 }
      );
    }

    // Always use stored locationId for sub-account (location-level) API calls
    const locationId = await getGHLLocationId();
    
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required. Please configure it in the admin settings.' },
        { status: 400 }
      );
    }

    // Fetch users for this location (API v2)
    // Endpoint: GET /users/?locationId={locationId}
    const usersResponse = await fetch(
      `https://services.leadconnectorhq.com/users/?locationId=${locationId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!usersResponse.ok) {
      let errorMessage = `HTTP ${usersResponse.status}`;
      let errorDetails: any = {};
      
      try {
        const errorData = await usersResponse.json();
        errorDetails = errorData;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.msg) {
          errorMessage = errorData.msg;
        }
      } catch {
        // If JSON parsing fails, try to get text
        const text = await usersResponse.text().catch(() => '');
        errorMessage = text || usersResponse.statusText || `HTTP ${usersResponse.status}`;
      }

      // Provide helpful error messages based on status code
      if (usersResponse.status === 401) {
        const details = errorDetails.message || errorDetails.error || errorMessage;
        return NextResponse.json(
          { 
            error: 'Unauthorized - Invalid token or missing required scopes',
            details: `GHL API says: ${details}. Make sure your PIT token has users.readonly scope.`
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: errorMessage, details: errorDetails },
        { status: usersResponse.status }
      );
    }

    const usersData = await usersResponse.json();
    
    // Handle different response structures
    // GHL might return { users: [...] } or just an array
    const users = usersData.users || usersData || [];
    
    // Format users for the UI
    const formattedUsers = Array.isArray(users) ? users.map((user: any) => ({
      id: user.id || user.userId,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Unknown User',
      email: user.email || '',
    })) : [];

    return NextResponse.json({
      success: true,
      users: formattedUsers,
    });
  } catch (error) {
    console.error('Error fetching GHL users:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch users from GHL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}