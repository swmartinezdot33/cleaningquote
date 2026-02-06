import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getGHLConfig, getGHLToken, getGHLLocationId } from '@/lib/kv';
import { getContactById, updateContact } from '@/lib/ghl/client';

/**
 * Generate a human-readable, unique Quote ID (same format as full quote for consistency).
 */
function generateReadableQuoteId(): string {
  const date = new Date();
  const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `QT-${yymmdd}-${randomSuffix}`;
}

/**
 * POST - Log a disqualified lead to the quotes table with status = 'disqualified'.
 * Call this when the survey flow hits an option with skipToQuestionId === '__DISQUALIFY__'.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
      country,
      toolId: bodyToolId,
      toolSlug,
      ghlContactId,
      disqualifiedQuestionLabel,
      disqualifiedOptionLabel,
    } = body;

    // Resolve tool for multi-tenant (same as main quote route)
    let toolId: string | null = typeof bodyToolId === 'string' && bodyToolId.trim() ? bodyToolId.trim() : null;
    if (!toolId && toolSlug && typeof toolSlug === 'string') {
      const slug = toolSlug.trim();
      try {
        const supabase = createSupabaseServer();
        const { data: toolsWithSlug } = await supabase.from('tools').select('id').eq('slug', slug);
        const list = (toolsWithSlug ?? []) as { id: string }[];
        if (list.length === 1) {
          toolId = list[0].id;
        }
      } catch {
        toolId = null;
      }
    }

    const generatedQuoteId = generateReadableQuoteId();
    const payload: Record<string, unknown> = {
      status: 'disqualified',
      disqualifiedQuestionLabel: disqualifiedQuestionLabel ?? '',
      disqualifiedOptionLabel: disqualifiedOptionLabel ?? '',
      disqualifiedAt: new Date().toISOString(),
      ...(toolId && { toolId }),
      // Store all submitted form fields for reference
      formData: {
        firstName: firstName ?? '',
        lastName: lastName ?? '',
        email: email ?? '',
        phone: phone ?? '',
        address: address ?? '',
        city: city ?? '',
        state: state ?? '',
        postalCode: postalCode ?? '',
        country: country ?? 'US',
        ...Object.fromEntries(
          Object.entries(body).filter(
            ([k]) =>
              !['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'state', 'postalCode', 'country', 'toolId', 'toolSlug', 'disqualifiedQuestionLabel', 'disqualifiedOptionLabel'].includes(k)
          )
        ),
      },
    };

    const supabase = createSupabaseServer();
    // @ts-expect-error Supabase generated types may not include quotes table yet
    const { error } = await supabase.from('quotes').insert({
      quote_id: generatedQuoteId,
      tool_id: toolId,
      first_name: firstName ?? null,
      last_name: lastName ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      city: city ?? null,
      state: state ?? null,
      postal_code: postalCode ?? null,
      country: country ?? null,
      service_type: null,
      frequency: null,
      price_low: null,
      price_high: null,
      square_feet: null,
      bedrooms: null,
      full_baths: null,
      half_baths: null,
      summary_text: `Disqualified: ${disqualifiedQuestionLabel ?? ''} — ${disqualifiedOptionLabel ?? ''}`,
      payload,
      ghl_contact_id: null,
      ghl_object_id: null,
      status: 'disqualified',
    });

    if (error) {
      console.error('Failed to store disqualified quote in Supabase:', error);
      return NextResponse.json({ error: 'Failed to log disqualified lead' }, { status: 500 });
    }

    // Apply disqualified lead tags to the contact in GHL when configured
    if (ghlContactId && toolId) {
      try {
        const ghlConfig = await getGHLConfig(toolId);
        const tagsToAdd = ghlConfig?.disqualifiedLeadTags;
        if (Array.isArray(tagsToAdd) && tagsToAdd.length > 0) {
          const token = await getGHLToken(toolId);
          const locationId = await getGHLLocationId(toolId);
          if (token && locationId) {
            const existing = await getContactById(ghlContactId, token, locationId);
            const existingTags = Array.isArray((existing as { tags?: string[] }).tags) ? (existing as { tags?: string[] }).tags! : [];
            const merged = [...new Set([...existingTags, ...tagsToAdd])];
            await updateContact(
              ghlContactId,
              {
                firstName: (existing as { firstName?: string }).firstName ?? firstName ?? '',
                lastName: (existing as { lastName?: string }).lastName ?? lastName ?? '',
                email: (existing as { email?: string }).email ?? email ?? '',
                phone: (existing as { phone?: string }).phone ?? phone ?? '',
                tags: merged,
              },
              token,
              locationId
            );
          }
        }
      } catch (tagErr) {
        console.error('Failed to add disqualified tags to GHL contact:', tagErr);
        // Don't fail the request; quote was already logged
      }
    }

    return NextResponse.json({ success: true, quoteId: generatedQuoteId });
  } catch (err) {
    console.error('Disqualified quote API error:', err);
    return NextResponse.json({ error: 'Failed to log disqualified lead' }, { status: 500 });
  }
}
