/**
 * CRM: Create or update contact and property from quote submission.
 * Used by the quote API after storing a quote.
 */

import { createSupabaseServer } from '@/lib/supabase/server';

export interface QuoteContactData {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

export interface UpsertResult {
  contactId: string;
  propertyId: string;
}

function normalizeAddress(data: QuoteContactData): string {
  const parts = [
    data.address,
    data.city,
    data.state,
    data.postalCode,
    data.country,
  ].filter(Boolean);
  return parts.map((p) => String(p).trim()).join(' ').toLowerCase();
}

/**
 * Upsert contact and property from quote data.
 * - Contact: dedupe by org_id + email (when email present)
 * - Property: dedupe by contact_id + normalized address
 */
export async function upsertContactAndPropertyFromQuote(
  orgId: string,
  toolId: string,
  quoteId: string,
  data: QuoteContactData
): Promise<UpsertResult | null> {
  const supabase = createSupabaseServer();
  const email = data.email ? String(data.email).trim() || null : null;

  // Upsert contact
  let contactId: string | null = null;

  if (email) {
    const { data: existing } = await (supabase as any)
      .from('contacts')
      .select('id')
      .eq('org_id', orgId)
      .eq('email', email)
      .maybeSingle();

    if (existing?.id) {
      contactId = existing.id;
      await (supabase as any)
        .from('contacts')
        .update({
          first_name: data.firstName ?? undefined,
          last_name: data.lastName ?? undefined,
          phone: data.phone ?? undefined,
          stage: 'quoted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contactId);
    }
  }

  if (!contactId) {
    const { data: inserted, error } = await (supabase as any)
      .from('contacts')
      .insert({
        org_id: orgId,
        first_name: data.firstName ?? null,
        last_name: data.lastName ?? null,
        email: email ?? null,
        phone: data.phone ? String(data.phone).trim() || null : null,
        source: 'Website Quote Form',
        stage: 'quoted',
      })
      .select('id')
      .single();

    if (error || !inserted?.id) {
      console.error('CRM: Failed to create contact:', error);
      return null;
    }
    contactId = inserted.id;
  }

  // Upsert property
  const normAddr = normalizeAddress(data);
    const { data: existingProps } = await (supabase as any)
      .from('properties')
      .select('id, address, city, state, postal_code')
    .eq('contact_id', contactId)
    .eq('org_id', orgId);

  let propertyId: string | null = null;
  for (const p of existingProps ?? []) {
    if (normalizeAddress({ address: p.address, city: p.city, state: p.state, postalCode: p.postal_code }) === normAddr) {
      propertyId = p.id;
      break;
    }
  }

  if (!propertyId) {
    const { data: inserted, error } = await (supabase as any)
      .from('properties')
      .insert({
        contact_id: contactId,
        org_id: orgId,
        address: data.address ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        postal_code: data.postalCode ?? null,
        country: data.country ?? null,
        stage: 'quoted',
      })
      .select('id')
      .single();

    if (error || !inserted?.id) {
      console.error('CRM: Failed to create property:', error);
      return null;
    }
    propertyId = inserted.id;
  }

  // Update quote with property_id
  await (supabase as any)
    .from('quotes')
    .update({ property_id: propertyId })
    .eq('quote_id', quoteId);

  // Insert activity
  await (supabase as any).from('activities').insert({
    contact_id: contactId,
    org_id: orgId,
    type: 'quote',
    title: 'Quote submitted',
    metadata: { quote_id: quoteId, property_id: propertyId },
  });

  if (!contactId || !propertyId) return null;
  return { contactId, propertyId };
}
