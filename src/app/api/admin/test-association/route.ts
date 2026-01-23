import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import { makeGHLRequest } from '@/lib/ghl/client';

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
 * POST - Test association between a quote and contact
 * This endpoint helps debug association issues
 */
export async function POST(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { quoteRecordId, contactId, targetKey } = body;

    if (!quoteRecordId || !contactId) {
      return NextResponse.json(
        { error: 'quoteRecordId and contactId are required' },
        { status: 400 }
      );
    }

    const token = await getGHLToken();
    const locationId = await getGHLLocationId();

    if (!token || !locationId) {
      return NextResponse.json(
        { error: 'GHL token or location ID not configured' },
        { status: 400 }
      );
    }

    // Try different targetKey variations if not provided
    const targetKeysToTry = targetKey 
      ? [targetKey]
      : ['custom_objects.quotes', 'quotes', 'Quote', 'quote'];

    const endpointsToTry = [
      `/associations/relations?locationId=${locationId}`,
      `/associations/relations`,
    ];

    const results: Array<{
      endpoint: string;
      targetKey: string;
      success: boolean;
      error?: string;
      response?: any;
    }> = [];

    for (const endpoint of endpointsToTry) {
      for (const targetKeyToTry of targetKeysToTry) {
        try {
          const payload = {
            locationId,
            sourceKey: 'Contact',
            sourceId: contactId,
            targetKey: targetKeyToTry,
            targetId: quoteRecordId,
          };

          console.log('🧪 Testing association:', payload);

          const response = await makeGHLRequest<any>(
            endpoint,
            'POST',
            payload
          );

          results.push({
            endpoint,
            targetKey: targetKeyToTry,
            success: true,
            response,
          });

          // If one succeeds, return early
          return NextResponse.json({
            success: true,
            message: 'Association successful',
            endpoint,
            targetKey: targetKeyToTry,
            payload,
            response,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          results.push({
            endpoint,
            targetKey: targetKeyToTry,
            success: false,
            error: errorMsg,
          });
        }
      }
    }

    // All attempts failed
    return NextResponse.json({
      success: false,
      message: 'All association attempts failed',
      attempts: results,
      recommendations: [
        'Check if the quote record ID is correct',
        'Check if the contact ID is correct',
        'Verify the custom object schema key in GHL',
        'Check API token has associations scope',
      ],
    }, { status: 400 });
  } catch (error) {
    console.error('Error testing association:', error);
    return NextResponse.json(
      {
        error: 'Failed to test association',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
