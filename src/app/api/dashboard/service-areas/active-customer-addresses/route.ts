import { NextRequest, NextResponse } from 'next/server';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import {
  getContactsWithTagFilter,
  ACTIVE_CUSTOMER_TAG_NAMES,
} from '@/lib/ghl/ghl-client';

export const dynamic = 'force-dynamic';

/**
 * Build a single-line address from GHL contact fields. Returns null if no usable address.
 */
function contactToAddressLine(contact: any): string | null {
  const parts = [
    contact.address1 ?? contact.address ?? '',
    contact.city ?? '',
    contact.state ?? '',
    contact.postalCode ?? contact.postal_code ?? '',
    contact.country ?? '',
  ]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);
  const line = parts.join(', ');
  return line.length > 0 ? line : null;
}

/**
 * GET /api/dashboard/service-areas/active-customer-addresses
 * Returns addresses of contacts that have tag "active" or "active client" (for service area map pins).
 * Uses dashboard GHL context (locationId + token).
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await resolveGHLContext(request);
    if (!ctx) {
      return NextResponse.json(
        { addresses: [], error: 'Location context required' },
        { status: 401 }
      );
    }
    if ('needsConnect' in ctx) {
      return NextResponse.json({
        addresses: [],
        needsConnect: true,
      });
    }

    const result = await getContactsWithTagFilter(
      ctx.locationId,
      { token: ctx.token, locationId: ctx.locationId },
      ACTIVE_CUSTOMER_TAG_NAMES,
      { limit: 100 }
    );

    if (!result.ok) {
      const status = result.error.type === 'auth' ? 401 : 502;
      return NextResponse.json(
        { addresses: [], error: result.error.message },
        { status }
      );
    }

    const addresses: string[] = [];
    const seen = new Set<string>();
    for (const contact of result.data.contacts) {
      const addr = contactToAddressLine(contact);
      if (addr && !seen.has(addr)) {
        seen.add(addr);
        addresses.push(addr);
      }
    }

    return NextResponse.json({ addresses });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load active customer addresses';
    console.warn('[CQ active-customer-addresses]', msg);
    return NextResponse.json(
      { addresses: [], error: msg },
      { status: 500 }
    );
  }
}
