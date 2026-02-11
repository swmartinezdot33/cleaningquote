import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { upsertContactAndPropertyFromQuote } from '@/lib/crm/upsert-contact-property';

/**
 * POST /api/quote/[id]/save-contact
 * Saves contact info to an existing quote (internal tool flow: contact collected after quote summary).
 * Body: { firstName, lastName, email, phone }
 * Updates the quote row and creates/updates CRM contact and property.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: quoteId } = await context.params;
    if (!quoteId?.trim()) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const firstName = body.firstName != null ? String(body.firstName).trim() : '';
    const lastName = body.lastName != null ? String(body.lastName).trim() : '';
    const email = body.email != null ? String(body.email).trim() : '';
    const phone = body.phone != null ? String(body.phone).trim() : '';

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'First name, last name, and email are required to save the quote to a contact.' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServer();

    // Load quote by quote_id (and optionally by ghl_object_id)
    const { data: quoteRow, error: fetchError } = await (supabase as any)
      .from('quotes')
      .select('id, quote_id, tool_id, first_name, last_name, email, phone')
      .or(`quote_id.eq.${quoteId},ghl_object_id.eq.${quoteId}`)
      .maybeSingle();

    if (fetchError || !quoteRow) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const rowQuoteId = quoteRow.quote_id as string;
    const toolId = quoteRow.tool_id as string | null;

    // Update quote with contact info
    const { error: updateError } = await (supabase as any)
      .from('quotes')
      .update({
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        phone: phone || null,
      })
      .eq('quote_id', rowQuoteId);

    if (updateError) {
      console.error('save-contact: quote update failed', updateError);
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
    }

    // Create/update CRM contact and property, link quote to property
    if (toolId) {
      try {
        const { data: toolRow } = await supabase.from('tools').select('org_id').eq('id', toolId).single();
        const orgId = (toolRow as { org_id?: string } | null)?.org_id;
        if (orgId) {
          await upsertContactAndPropertyFromQuote(orgId, toolId, rowQuoteId, {
            firstName,
            lastName,
            email,
            phone,
          });
        }
      } catch (crmErr) {
        console.error('save-contact: CRM upsert failed', crmErr);
        // Quote was already updated; still return success
      }
    }

    return NextResponse.json({ success: true, message: 'Quote saved to contact.' });
  } catch (err) {
    console.error('save-contact error', err);
    return NextResponse.json({ error: 'Failed to save contact' }, { status: 500 });
  }
}
