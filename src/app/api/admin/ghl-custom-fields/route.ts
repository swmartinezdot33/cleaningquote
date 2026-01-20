import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';

/**
 * Authenticate request with admin password
 */
function authenticate(request: NextRequest): NextResponse | null {
  const password = request.headers.get('x-admin-password');
  const requiredPassword = process.env.ADMIN_PASSWORD;

  if (requiredPassword && password !== requiredPassword) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing password.' },
      { status: 401 }
    );
  }
  return null;
}

/**
 * GET - Retrieve GHL custom fields for contacts
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const token = await getGHLToken();
    const locationId = await getGHLLocationId();

    if (!token) {
      return NextResponse.json(
        { error: 'GHL token not configured' },
        { status: 400 }
      );
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required. Please configure it in the admin settings.' },
        { status: 400 }
      );
    }

    // Fetch custom fields from GHL API v2
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/customFields?model=contact`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: response.statusText };
      }
      
      // If it's a 401 or 403, provide more helpful error message
      if (response.status === 401) {
        return NextResponse.json(
          { 
            error: 'Unauthorized. Please check your GHL token and ensure it has the correct scopes.',
            details: errorData.message || 'Invalid or expired token',
            fields: [
              { key: 'firstName', name: 'First Name', type: 'native' },
              { key: 'lastName', name: 'Last Name', type: 'native' },
              { key: 'email', name: 'Email', type: 'native' },
              { key: 'phone', name: 'Phone', type: 'native' },
            ],
          },
          { status: 401 }
        );
      }
      
      if (response.status === 403) {
        return NextResponse.json(
          { 
            error: 'Forbidden. Your token may not have the required scopes.',
            details: errorData.message || 'Insufficient permissions',
            fields: [
              { key: 'firstName', name: 'First Name', type: 'native' },
              { key: 'lastName', name: 'Last Name', type: 'native' },
              { key: 'email', name: 'Email', type: 'native' },
              { key: 'phone', name: 'Phone', type: 'native' },
            ],
          },
          { status: 403 }
        );
      }
      
      throw new Error(`Failed to fetch custom fields: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    const customFields = data.customFields || data.data || [];

    // Native GHL fields that can be mapped
    const nativeFields = [
      { key: 'firstName', name: 'First Name', type: 'native' },
      { key: 'lastName', name: 'Last Name', type: 'native' },
      { key: 'email', name: 'Email', type: 'native' },
      { key: 'phone', name: 'Phone', type: 'native' },
    ];

    // Format custom fields and filter out invalid ones
    const formattedCustomFields = customFields
      .map((field: any) => {
        const key = field.key || field.fieldKey || field.id;
        // Only include fields with valid keys
        if (!key || typeof key !== 'string' || key.trim() === '') {
          return null;
        }
        return {
          key: key.trim(),
          name: field.name || field.label || 'Unnamed Field',
          type: field.dataType || 'text',
          fieldType: 'custom',
        };
      })
      .filter((field: any) => field !== null);

    return NextResponse.json({
      success: true,
      fields: [
        ...nativeFields,
        ...formattedCustomFields,
      ],
    });
  } catch (error) {
    console.error('Error fetching GHL custom fields:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch GHL custom fields', 
        details: (error as Error).message,
        fields: [
          { key: 'firstName', name: 'First Name', type: 'native' },
          { key: 'lastName', name: 'Last Name', type: 'native' },
          { key: 'email', name: 'Email', type: 'native' },
          { key: 'phone', name: 'Phone', type: 'native' },
        ],
      },
      { status: 500 }
    );
  }
}
