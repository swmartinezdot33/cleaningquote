import { NextRequest, NextResponse } from 'next/server';
import { getGHLToken, getGHLLocationId, getGHLConfig } from '@/lib/kv';
import { fireWebhook } from '@/lib/webhook';
import { createOrUpdateContact } from '@/lib/ghl/client';
import { parseAddress } from '@/lib/utils/parseAddress';
import { createSupabaseServer } from '@/lib/supabase/server';

async function resolveToolId(toolSlug: string | undefined, toolIdParam: string | undefined): Promise<string | undefined> {
  if (toolIdParam && typeof toolIdParam === 'string') return toolIdParam;
  if (!toolSlug || typeof toolSlug !== 'string') return undefined;
  const supabase = createSupabaseServer();
  const { data } = await supabase.from('tools').select('id').eq('slug', toolSlug.trim()).maybeSingle();
  return (data as { id: string } | null)?.id ?? undefined;
}

/**
 * POST /api/service-area/out-of-service
 * Create a contact in GHL with out-of-service tags.
 * Uses the tool's GHL when toolSlug or toolId is provided; otherwise global.
 *
 * Request body: { firstName, lastName, email, phone, address?, address2?, toolSlug?, toolId? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, address, address2, toolSlug, toolId: toolIdParam } = body;

    if (!firstName || !lastName || !email || !phone) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email, phone' },
        { status: 400 }
      );
    }

    const toolId = await resolveToolId(toolSlug, toolIdParam);

    const token = await getGHLToken(toolId);
    const locationId = await getGHLLocationId(toolId);
    const config = await getGHLConfig(toolId);

    if (!token) {
      return NextResponse.json(
        { error: 'GHL token not configured. Please set it in the admin settings.' },
        { status: 500 }
      );
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID not configured' },
        { status: 500 }
      );
    }

    // Combine address and address2 if address2 exists (GHL only has one address line)
    const fullAddress = address2 
      ? `${address || ''} ${address2}`.trim()
      : address || '';

    // Parse address if provided
    let parsedStreetAddress = fullAddress;
    let parsedCity = '';
    let parsedState = '';
    let parsedPostalCode = '';

    if (fullAddress) {
      const parsed = parseAddress(fullAddress);
      parsedStreetAddress = parsed.streetAddress || fullAddress;
      parsedCity = parsed.city || '';
      parsedState = parsed.state || '';
      parsedPostalCode = parsed.zipCode || '';
    }

    // Create contact with out-of-service tags
    const contactData: any = {
      firstName,
      lastName,
      email,
      phone,
    };

    if (parsedStreetAddress) contactData.address1 = parsedStreetAddress;
    if (parsedCity) contactData.city = parsedCity;
    if (parsedState) contactData.state = parsedState;
    if (parsedPostalCode) contactData.postalCode = parsedPostalCode;

    const contactId = await createOrUpdateContact(
      contactData,
      token,
      locationId,
      config?.outOfServiceTags
    );

    if (toolId) {
      fireWebhook(toolId, 'out_of_service_area', { contactId }).catch(() => {});
    }

    return NextResponse.json(
      {
        success: true,
        contactId,
        message: 'Out-of-service contact created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating out-of-service contact:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create out-of-service contact',
      },
      { status: 500 }
    );
  }
}
