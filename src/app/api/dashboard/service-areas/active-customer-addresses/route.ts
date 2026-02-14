import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getDashboardLocationAndOrg } from '@/lib/dashboard-location';
import { resolveGHLContext } from '@/lib/ghl/api-context';
import {
  getContactsWithTagFilter,
  getContacts,
  ACTIVE_CUSTOMER_TAG_NAMES,
} from '@/lib/ghl/ghl-client';
import {
  normalizeAddressForHash,
  hashAddress,
  geocodeAddressesBatch,
} from '@/lib/geocode-server';

export const dynamic = 'force-dynamic';

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

function contactDisplayName(contact: any): string {
  const first = (contact.firstName ?? contact.first_name ?? '').trim();
  const last = (contact.lastName ?? contact.last_name ?? '').trim();
  const name = [first, last].filter(Boolean).join(' ');
  return name || (contact.companyName ?? contact.company_name ?? '') || 'Customer';
}

function customersFromContacts(contacts: any[]): Array<{ name: string; address: string }> {
  const out: Array<{ name: string; address: string }> = [];
  const seen = new Set<string>();
  for (const contact of contacts) {
    const addr = contactToAddressLine(contact);
    if (addr && !seen.has(addr)) {
      seen.add(addr);
      out.push({ name: contactDisplayName(contact), address: addr });
    }
  }
  return out;
}

/**
 * GET /api/dashboard/service-areas/active-customer-addresses
 * Returns coordinates (and addresses) for contacts tagged "active" or "active client".
 * Uses Supabase cache per org; geocodes server-side in batch and caches for instant loads.
 */
export async function GET(request: NextRequest) {
  try {
    const resolved = await getDashboardLocationAndOrg(request);
    if (resolved instanceof NextResponse) return resolved;
    const { orgId } = resolved;
    if (!orgId) {
      return NextResponse.json({ coordinates: [], addresses: [] });
    }

    const ctx = await resolveGHLContext(request);
    if (!ctx) {
      return NextResponse.json(
        { coordinates: [], addresses: [], error: 'Location context required' },
        { status: 401 }
      );
    }
    if ('needsConnect' in ctx) {
      return NextResponse.json({
        coordinates: [],
        addresses: [],
        needsConnect: true,
      });
    }

    const credentials = { token: ctx.token, locationId: ctx.locationId };
    let result = await getContactsWithTagFilter(
      ctx.locationId,
      credentials,
      ACTIVE_CUSTOMER_TAG_NAMES,
      { limit: 100 }
    );

    if (!result.ok) {
      const status = result.error.type === 'auth' ? 401 : 502;
      return NextResponse.json(
        { coordinates: [], addresses: [], error: result.error.message },
        { status }
      );
    }

    let customers = customersFromContacts(result.data.contacts);
    if (customers.length === 0) {
      const allResult = await getContacts(ctx.locationId, credentials, { limit: 100 });
      if (allResult.ok && allResult.data.contacts.length > 0) {
        customers = customersFromContacts(allResult.data.contacts);
      }
    }

    if (customers.length === 0) {
      return NextResponse.json({ coordinates: [], addresses: [], customers: [] });
    }

    const addresses = customers.map((c) => c.address);
    const normalized = addresses.map((a) => normalizeAddressForHash(a));
    const hashes = normalized.map((n) => hashAddress(n));

    const supabase = createSupabaseServer();
    const { data: cachedRows } = await supabase
      .from('org_customer_map_cache')
      .select('address_hash, lat, lng')
      .eq('org_id', orgId)
      .in('address_hash', hashes);

    const cacheMap = new Map<string, { lat: number; lng: number }>();
    (cachedRows ?? []).forEach((r: { address_hash: string; lat: number; lng: number }) => {
      cacheMap.set(r.address_hash, { lat: r.lat, lng: r.lng });
    });

    const toGeocode: { hash: string; address: string }[] = [];
    hashes.forEach((h, i) => {
      if (!cacheMap.has(h)) toGeocode.push({ hash: h, address: addresses[i] });
    });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY?.trim() || null;
    if (toGeocode.length > 0 && apiKey) {
      const geocodeResults = await geocodeAddressesBatch(
        toGeocode.map((x) => x.address),
        apiKey,
        10
      );
      const toUpsert: { org_id: string; address_hash: string; lat: number; lng: number }[] = [];
      toGeocode.forEach(({ hash }, i) => {
        const coord = geocodeResults[i];
        if (coord) {
          cacheMap.set(hash, coord);
          toUpsert.push({ org_id: orgId, address_hash: hash, lat: coord.lat, lng: coord.lng });
        }
      });
      if (toUpsert.length > 0) {
        await (supabase as any).from('org_customer_map_cache').upsert(toUpsert, {
          onConflict: 'org_id,address_hash',
          ignoreDuplicates: false,
        });
      }
    }

    const pinnedNorm = (request.nextUrl.searchParams.get('pinnedAddress') ?? '').trim().toLowerCase();
    const paired = customers.map((c, i) => ({
      name: c.name,
      address: c.address,
      coord: cacheMap.get(hashes[i]) ?? null,
    }));
    const filtered = pinnedNorm
      ? paired.filter((p) => p.address.trim().toLowerCase() !== pinnedNorm)
      : paired;
    const customersOut = filtered
      .filter((p) => p.coord != null)
      .map((p) => ({ lat: p.coord!.lat, lng: p.coord!.lng, name: p.name, address: p.address }));

    // Always return all addresses (for client-side geocode fallback when cache empty or partial)
    const allAddresses = filtered.map((p) => p.address);
    // Name + address for every contact so the map can show names on geocoded markers
    const customerList = filtered.map((p) => ({ name: p.name, address: p.address }));

    return NextResponse.json({
      coordinates: customersOut.map((c) => ({ lat: c.lat, lng: c.lng })),
      addresses: allAddresses,
      customers: customersOut,
      customerList,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load active customer addresses';
    console.warn('[CQ active-customer-addresses]', msg);
    return NextResponse.json(
      { coordinates: [], addresses: [], error: msg },
      { status: 500 }
    );
  }
}
