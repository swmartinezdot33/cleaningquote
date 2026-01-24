import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import { makeGHLRequest, getObjectSchema } from '@/lib/ghl/client';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

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
 * GET - Test association definitions endpoint (list associations)
 * Verifies GET /associations and finds Contact-Quote association ID without needing quote/contact IDs.
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const token = await getGHLToken();
    const locationId = await getGHLLocationId();

    if (!token || !locationId) {
      return NextResponse.json(
        { error: 'GHL token or location ID not configured' },
        { status: 400 }
      );
    }

    const associationEndpoints = [
      { url: `/associations/key/contact_quote?locationId=${locationId}`, withHeader: false },
      { url: `/associations/key/contact_quote`, withHeader: true },
      { url: `/v2/locations/${locationId}/associations`, withHeader: true },
      { url: `/associations?locationId=${locationId}`, withHeader: false },
      { url: `/associations`, withHeader: true },
      { url: `/associations/object-keys?firstObjectKey=contact&secondObjectKey=custom_objects.quotes&locationId=${locationId}`, withHeader: false },
      { url: `/associations/object-keys?firstObjectKey=Contact&secondObjectKey=quotes&locationId=${locationId}`, withHeader: false },
    ];

    let raw: any = null;
    let lastError: string | null = null;

    for (const { url, withHeader } of associationEndpoints) {
      try {
        raw = await makeGHLRequest<any>(url, 'GET', undefined, withHeader ? locationId : undefined);
        if (raw != null) break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        continue;
      }
    }

    // GHL may return 400 "Association already deleted or not found" when no definitions exist
    const isNoAssociations = lastError && (
      /Association.*deleted|not found|Association.*not found/i.test(lastError) ||
      /400/.test(lastError)
    );
    if (raw == null && lastError) {
      if (isNoAssociations) {
        return NextResponse.json({
          success: true,
          associationsWorking: true,
          message: 'Associations API reached. No Contact-Quote association definition found in GHL.',
          associationCount: 0,
          contactQuoteFound: false,
          contactQuoteAssociationId: null,
          ghlMessage: lastError,
          recommendation: 'Create a Contact–Quote association in GHL: Settings > Custom Objects > Quote > Associations (or link Contact to your Quote object).',
        });
      }
      return NextResponse.json({
        success: false,
        message: 'Could not fetch association definitions',
        error: lastError,
        endpointsTried: associationEndpoints.map((e) => e.url),
      }, { status: 400 });
    }

    const list = Array.isArray(raw) ? raw : (raw?.associations ?? raw?.data ?? (raw?.id ? [raw] : []));
    const associations = Array.isArray(list) ? list : [];

    const contactQuote = associations.find((a: any) => {
      const f = (a.firstEntityKey || a.firstEntity || a.sourceKey || a.firstObjectKey || '').toLowerCase();
      const s = (a.secondEntityKey || a.secondEntity || a.targetKey || a.secondObjectKey || '').toLowerCase();
      const isContact = (x: string) => x === 'contact' || x === 'contacts';
      const isQuote = (x: string) => x.includes('quote') || x === 'quotes';
      return (isContact(f) && isQuote(s)) || (isQuote(f) && isContact(s));
    });

    const contactQuoteId = contactQuote
      ? (contactQuote.id || contactQuote.associationId || contactQuote._id)
      : null;

    return NextResponse.json({
      success: true,
      message: 'Association definitions fetched',
      associationCount: associations.length,
      contactQuoteAssociationId: contactQuoteId,
      contactQuoteFound: !!contactQuote,
      associations: associations.slice(0, 20).map((a: any) => ({
        id: a.id || a.associationId || a._id,
        first: a.firstEntityKey || a.firstEntity || a.firstObjectKey,
        second: a.secondEntityKey || a.secondEntity || a.secondObjectKey,
      })),
      rawKeys: raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw) : [],
    });
  } catch (error) {
    console.error('Error in GET test-association:', error);
    return NextResponse.json(
      { error: 'Failed to fetch associations', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Create the Contact-Quote association definition in GHL
 *
 * Calls POST /associations/ (Create Association):
 * https://marketplace.gohighlevel.com/docs/ghl/associations/create-association
 *
 * Contact–custom object pattern (like student_teacher): locationId, key,
 * firstObjectLabel, firstObjectKey, secondObjectLabel, secondObjectKey.
 * Custom object key: custom_objects.quotes. Contact key: contact.
 */
export async function PUT(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const token = await getGHLToken();
    const locationId = await getGHLLocationId();
    if (!token || !locationId) {
      return NextResponse.json({ error: 'GHL token or location ID not configured' }, { status: 400 });
    }

    // Quote object key: custom_objects.quotes (from schema or fallback). Contact: contact.
    let quoteObjectKey = 'custom_objects.quotes';
    try {
      const schema = await getObjectSchema('custom_objects.quotes', locationId);
      const k = schema?.object?.key;
      if (k && typeof k === 'string') quoteObjectKey = k;
    } catch (_) {}

    // Contact–custom object body shape: firstObjectLabel, firstObjectKey, secondObjectLabel, secondObjectKey, key, locationId
    const bodies: Record<string, unknown>[] = [
      // Contact first, Quote second (like contact_notes)
      { locationId, key: 'contact_quote', firstObjectLabel: 'Contact', firstObjectKey: 'contact', secondObjectLabel: 'Quote', secondObjectKey: quoteObjectKey },
      // Quote first, Contact second (like student_teacher: custom object first, contact second)
      { locationId, key: 'contact_quote', firstObjectLabel: 'Quote', firstObjectKey: quoteObjectKey, secondObjectLabel: 'Contact', secondObjectKey: 'contact' },
      { locationId, key: 'quote_contact', firstObjectLabel: 'Quote', firstObjectKey: quoteObjectKey, secondObjectLabel: 'Contact', secondObjectKey: 'contact' },
    ];

    let lastStatus = 0;
    let lastErr: string | Record<string, unknown> = '';
    let lastBody: Record<string, unknown> | null = null;

    for (const body of bodies) {
      lastBody = body;
      const res = await fetch(`${GHL_API_BASE}/associations/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Version': '2021-07-28',
          'Location-Id': locationId,
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      lastStatus = res.status;
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch { /* ignored */ }
      }
      lastErr = (parsed && typeof parsed === 'object')
        ? (parsed as Record<string, unknown>)
        : (text || res.statusText);

      if (res.ok) {
        const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
        return NextResponse.json({
          success: true,
          message: 'Contact-Quote association definition created',
          endpoint: 'POST /associations/',
          body,
          response: data,
          status: res.status,
        });
      }
      // 400 "duplicate pair of labels" = definition already exists
      if (res.status === 400 && typeof lastErr === 'object' && lastErr !== null && /duplicate pair of labels/i.test(String((lastErr as any).message || ''))) {
        return NextResponse.json({
          success: true,
          message: 'Contact-Quote association definition already exists',
          alreadyExisted: true,
          endpoint: 'POST /associations/',
          lastError: lastErr,
        });
      }
      if (res.status === 422 || res.status === 400) continue;
      return NextResponse.json({
        success: false,
        endpoint: 'POST /associations/',
        body,
        status: res.status,
        error: lastErr || text || res.statusText,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      message: 'Create attempts returned 422/400.',
      quoteObjectKeyUsed: quoteObjectKey,
      lastStatus,
      lastBody,
      lastError: lastErr,
      suggestion: 'Create in GHL: Settings > Custom Objects > [Quote] > Associations > Link to Contact.',
    }, { status: 400 });
  } catch (error) {
    console.error('Error in PUT test-association:', error);
    return NextResponse.json(
      { error: 'Failed to create association', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
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

    // Step 1: Fetch Contact-Quote association ID (use /associations/key/contact_quote first; /associations?locationId returns 400)
    let associationId: string | null = null;
    const assocEndpoints = [
      { url: `/associations/key/contact_quote?locationId=${locationId}`, withHeader: false },
      { url: `/associations/key/contact_quote`, withHeader: true },
    ];
    for (const { url, withHeader } of assocEndpoints) {
      try {
        const raw = await makeGHLRequest<any>(url, 'GET', undefined, withHeader ? locationId : undefined);
        const list = Array.isArray(raw) ? raw : (raw?.associations ?? raw?.data ?? (raw?.id ? [raw] : []));
        const assoc = (Array.isArray(list) ? list : []).find((a: any) => {
          const f = (a.firstObjectKey || a.firstEntityKey || '').toLowerCase();
          const s = (a.secondObjectKey || a.secondEntityKey || '').toLowerCase();
          return (f === 'contact' && s.includes('quote')) || (s === 'contact' && f.includes('quote'));
        });
        if (assoc) {
          associationId = assoc.id || assoc.associationId || assoc._id;
          console.log('✅ Found association definition:', associationId);
          break;
        }
      } catch (_) { continue; }
    }
    if (!associationId) console.warn('⚠️ No Contact-Quote association definition found');

    // Step 2: Create the relation. Use /associations/relations with Location-Id header only
    // (locationId in query causes 422; header is required for sub-accounts)
    const endpointsToTry = [
      `/associations/relations`,
    ];
    
    // GHL requires locationId in the body for /associations/relations; associationId required when creating a relation.
    const payloadsToTry = associationId 
      ? [{ associationId, firstRecordId: contactId, secondRecordId: quoteRecordId, locationId }]
      : [
          { firstRecordId: contactId, secondRecordId: quoteRecordId, locationId },
          { firstRecordId: quoteRecordId, secondRecordId: contactId, locationId },
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
        const cleanPayload = { ...payload };
        
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

    const needsAssoc = results.some((r) => /associationId.*(must be|empty)/i.test(r.error || ''));

    return NextResponse.json({
      success: false,
      message: 'All association attempts failed',
      attempts: results,
      associationsRelationsReachable: results.some((r) => /associationId|LocationId/i.test(r.error || '')),
      recommendations: [
        ...(needsAssoc ? ['Create a Contact–Quote association in GHL first (Settings > Custom Objects > Quote > Associations). Run GET /api/admin/test-association to verify.'] : []),
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
