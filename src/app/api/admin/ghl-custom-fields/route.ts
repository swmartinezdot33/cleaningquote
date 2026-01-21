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

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { 
          error: 'GHL token not configured',
          fields: [
            { key: 'firstName', name: 'First Name', type: 'native' },
            { key: 'lastName', name: 'Last Name', type: 'native' },
            { key: 'email', name: 'Email', type: 'native' },
            { key: 'phone', name: 'Phone', type: 'native' },
          ],
        },
        { status: 400 }
      );
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID is required. Please configure it in the admin settings.' },
        { status: 400 }
      );
    }

    // Fetch custom fields from GHL API
    // Note: This endpoint doesn't use /v2/ prefix - it uses the v1 endpoint structure
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
      
      // Handle specific HTTP error statuses with graceful responses
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
      
      // Handle 404 - no custom fields found or endpoint not available
      if (response.status === 404) {
        return NextResponse.json({
          success: true,
          fields: [
            { key: 'firstName', name: 'First Name', type: 'native' },
            { key: 'lastName', name: 'Last Name', type: 'native' },
            { key: 'email', name: 'Email', type: 'native' },
            { key: 'phone', name: 'Phone', type: 'native' },
          ],
        });
      }
      
      // For other errors, return error with fallback native fields
      return NextResponse.json(
        { 
          error: 'Failed to fetch GHL custom fields',
          details: errorData.message || response.statusText,
          fields: [
            { key: 'firstName', name: 'First Name', type: 'native' },
            { key: 'lastName', name: 'Last Name', type: 'native' },
            { key: 'email', name: 'Email', type: 'native' },
            { key: 'phone', name: 'Phone', type: 'native' },
          ],
        },
        { status: 400 }
      );
    }

    const data = await response.json();
    
    // Log the response structure for debugging
    console.log('GHL Custom Fields API Response:', JSON.stringify(data, null, 2));
    
    // GHL API might return fields in different structures:
    // - data.customFields
    // - data.data
    // - data (if it's an array)
    // - data.customFields[] (array)
    let customFields: any[] = [];
    
    if (Array.isArray(data)) {
      customFields = data;
    } else if (data.customFields && Array.isArray(data.customFields)) {
      customFields = data.customFields;
    } else if (data.data && Array.isArray(data.data)) {
      customFields = data.data;
    } else if (data.fields && Array.isArray(data.fields)) {
      customFields = data.fields;
    } else if (data.customField && Array.isArray(data.customField)) {
      customFields = data.customField;
    }

    console.log(`Found ${customFields.length} custom fields from GHL API`);

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
        // Try multiple possible key fields
        const key = field.key || field.fieldKey || field.id || field._id || field.fieldId;
        const name = field.name || field.label || field.title || 'Unnamed Field';
        
        // Only include fields with valid keys
        if (!key || typeof key !== 'string' || key.trim() === '') {
          console.warn('Skipping field with invalid key:', field);
          return null;
        }
        
        const formatted = {
          key: key.trim(),
          name: name.trim(),
          type: field.dataType || field.type || 'text',
          fieldType: 'custom',
        };
        
        console.log('Formatted custom field:', formatted);
        return formatted;
      })
      .filter((field: any) => field !== null);
    
    console.log(`Formatted ${formattedCustomFields.length} valid custom fields`);

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
