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

    // Step 1: Fetch association definitions to find the Contact-Quote association ID
    let associationId: string | null = null;
    
    try {
      console.log('🔍 Fetching association definitions...');
      const associationsResponse = await makeGHLRequest<any>(
        `/associations?locationId=${locationId}`,
        'GET'
      );
      
      const associations = associationsResponse.associations || associationsResponse.data || associationsResponse || [];
      
      // Look for association between Contact and Quote/quotes
      const contactQuoteAssociation = Array.isArray(associations) ? associations.find((assoc: any) => {
        const firstEntity = (assoc.firstEntityKey || assoc.firstEntity || assoc.sourceKey || '').toLowerCase();
        const secondEntity = (assoc.secondEntityKey || assoc.secondEntity || assoc.targetKey || '').toLowerCase();
        
        const isContactFirst = firstEntity === 'contact' || firstEntity === 'contacts';
        const isContactSecond = secondEntity === 'contact' || secondEntity === 'contacts';
        const isQuoteFirst = firstEntity.includes('quote') || firstEntity === 'quotes';
        const isQuoteSecond = secondEntity.includes('quote') || secondEntity === 'quotes';
        
        return (isContactFirst && isQuoteSecond) || (isQuoteFirst && isContactSecond);
      }) : null;
      
      if (contactQuoteAssociation) {
        associationId = contactQuoteAssociation.id || contactQuoteAssociation.associationId || contactQuoteAssociation._id;
        console.log('✅ Found association definition:', associationId);
      } else {
        console.warn('⚠️ No Contact-Quote association definition found');
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch association definitions:', error instanceof Error ? error.message : String(error));
    }

    // Step 2: Try creating the relation with correct format
    // Try both with and without locationId in query string
    const endpointsToTry = [
      `/associations/relations?locationId=${locationId}`,
      `/associations/relations`,
    ];
    
    const payloadsToTry = associationId 
      ? [{ associationId, firstRecordId: contactId, secondRecordId: quoteRecordId }]
      : [
          { firstRecordId: contactId, secondRecordId: quoteRecordId },
          { firstRecordId: quoteRecordId, secondRecordId: contactId },
        ];

    const results: Array<{
      endpoint: string;
      payload: any;
      success: boolean;
      error?: string;
      response?: any;
    }> = [];

    for (const endpoint of endpointsToTry) {
      for (const payload of payloadsToTry) {
        // Ensure locationId is NOT in payload body
        const cleanPayload = { ...payload };
        delete (cleanPayload as any).locationId;
        
        try {
          console.log('🧪 Testing association:', { endpoint, payload: cleanPayload });

          const response = await makeGHLRequest<any>(
            endpoint,
            'POST',
            cleanPayload
          );

          results.push({
            endpoint,
            payload: cleanPayload,
            success: true,
            response,
          });

          // If one succeeds, return early
          return NextResponse.json({
            success: true,
            message: 'Association successful',
            endpoint,
            payload: cleanPayload,
            response,
            associationId,
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          results.push({
            endpoint,
            payload: cleanPayload,
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
