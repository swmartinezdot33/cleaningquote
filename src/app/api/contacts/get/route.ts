import { NextRequest, NextResponse } from 'next/server';
import { getContactById } from '@/lib/ghl/client';
import { ghlTokenExists, getGHLToken, getGHLLocationId } from '@/lib/kv';
import { createSupabaseServer } from '@/lib/supabase/server';

/**
 * GET /api/contacts/get?contactId={contactId}[&toolId=...|&toolSlug=...]
 * Fetch contact information from GHL by contact ID.
 * Optional toolId or toolSlug: use that tool's GHL token/location (for multi-tool).
 * Used to pre-fill survey form when opening in new tab or iframe.
 * Public endpoint (no authentication required) - only reads contact data.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const toolIdParam = searchParams.get('toolId');
    const toolSlugParam = searchParams.get('toolSlug');

    if (!contactId) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: contactId',
          userMessage: 'Unable to load contact information.',
        },
        { status: 400 }
      );
    }

    // Resolve effective tool ID for per-tool GHL token/location
    let effectiveToolId: string | undefined;
    if (toolIdParam?.trim()) {
      effectiveToolId = toolIdParam.trim();
    } else if (toolSlugParam?.trim()) {
      const supabase = createSupabaseServer();
      const { data } = await supabase.from('tools').select('id').eq('slug', toolSlugParam.trim()).maybeSingle();
      const toolRow = data as { id: string } | null;
      if (toolRow?.id) effectiveToolId = toolRow.id;
    }

    // Check if GHL is configured (global or for this tool)
    const hasGHLToken = await ghlTokenExists(effectiveToolId ?? undefined).catch(() => false);

    if (!hasGHLToken) {
      // GHL not configured, return empty but don't fail
      return NextResponse.json(
        {
          success: false,
          message: 'GHL not configured',
          contact: null,
        }
      );
    }

    try {
      const token = await getGHLToken(effectiveToolId);
      const locationId = await getGHLLocationId(effectiveToolId).catch(() => undefined);
      // Fetch contact from GHL (use per-tool token/location when provided)
      const contact = await getContactById(contactId, token ?? undefined, locationId ?? undefined);

      return NextResponse.json({
        success: true,
        contact: {
          id: contact.id,
          firstName: contact.firstName || '',
          lastName: contact.lastName || '',
          email: contact.email || '',
          phone: contact.phone || '',
          address1: contact.address1 || '',
          city: contact.city || '',
          state: contact.state || '',
          postalCode: contact.postalCode || '',
          country: contact.country || 'US',
        },
      });
    } catch (ghlError) {
      console.error('Error fetching contact from GHL:', ghlError);
      
      // If contact not found or other GHL error, return success: false but don't fail the request
      return NextResponse.json({
        success: false,
        message: ghlError instanceof Error ? ghlError.message : 'Failed to fetch contact',
        contact: null,
      });
    }
  } catch (error) {
    console.error('Error in get contact endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to get contact',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
