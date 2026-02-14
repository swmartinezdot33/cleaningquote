import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import { searchConversations, getContactById } from '@/lib/ghl/client';

export const dynamic = 'force-dynamic';

/** Normalize contact from GHL (often snake_case) to camelCase for frontend. */
function normalizeContact(contact: Record<string, unknown> | null | undefined): {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
} | undefined {
  if (!contact || typeof contact !== 'object') return undefined;
  const c = contact as Record<string, unknown>;
  const get = (k: string) => {
    const v = c[k] ?? (c[k.replace(/([A-Z])/g, '_$1').toLowerCase()] as string | undefined);
    return typeof v === 'string' ? v.trim() : undefined;
  };
  const firstName = get('firstName') ?? get('first_name') ?? '';
  const lastName = get('lastName') ?? get('last_name') ?? '';
  const name = get('name') ?? (firstName || lastName ? [firstName, lastName].filter(Boolean).join(' ') : undefined);
  return {
    name: name || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: get('email'),
    phone: get('phone') ?? get('phoneNumber') ?? get('phone_number'),
  };
}

/**
 * GET /api/dashboard/crm/conversations
 * List conversations for the location (for Inbox middle column).
 * Query: limit, status, contactId (optional), query (optional search string)
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    if ('needsConnect' in ctx) return NextResponse.json({ error: 'Connect your location first' }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const status = searchParams.get('status')?.trim() || 'all';
    const contactId = searchParams.get('contactId')?.trim() || undefined;
    const query = searchParams.get('query')?.trim() || undefined;
    const sortBy = status === 'recents' ? 'last_manual_message_date' : 'last_message_date';

    const credentials = { token: ctx.token, locationId: ctx.locationId };
    const { conversations, total } = await searchConversations(
      ctx.locationId,
      { limit, status, contactId, query, sortBy, sort: 'desc' },
      credentials
    );

    let normalized = conversations.map((conv) => {
      const contact = normalizeContact(conv.contact as Record<string, unknown> | undefined);
      return { ...conv, contact };
    });

    // Enrich with contact details when GHL search didn't return name (fetch by contactId)
    const needsEnrich = normalized.filter(
      (c) => c.contactId && (!c.contact?.name && !c.contact?.firstName && !c.contact?.lastName && !c.contact?.email && !c.contact?.phone)
    );
    if (needsEnrich.length > 0) {
      const enriched = await Promise.all(
        normalized.map(async (conv) => {
          const needs = conv.contactId && (!conv.contact?.name && !conv.contact?.firstName && !conv.contact?.lastName);
          if (!needs) return conv;
          try {
            const full = await getContactById(conv.contactId!, undefined, undefined, credentials);
            const first = (full as { firstName?: string }).firstName ?? (full as { first_name?: string }).first_name ?? '';
            const last = (full as { lastName?: string }).lastName ?? (full as { last_name?: string }).last_name ?? '';
            const name = (full as { name?: string }).name ?? (first || last ? [first, last].filter(Boolean).join(' ') : undefined);
            const contact = {
              name: name || undefined,
              firstName: first || undefined,
              lastName: last || undefined,
              email: (full as { email?: string }).email,
              phone: (full as { phone?: string }).phone ?? (full as { phoneNumber?: string }).phoneNumber,
            };
            return { ...conv, contact };
          } catch {
            return conv;
          }
        })
      );
      normalized = enriched;
    }

    return NextResponse.json({ conversations: normalized, total: total ?? normalized.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('scope')) {
      return NextResponse.json(
        { error: 'Conversations require conversation permissions. Reconnect your location in GHL with the correct scopes.' },
        { status: 403 }
      );
    }
    console.error('CRM conversations list error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
