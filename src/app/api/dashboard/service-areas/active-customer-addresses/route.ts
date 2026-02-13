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

function addressesFromContacts(contacts: any[]): string[] {
  const addresses: string[] = [];
  const seen = new Set<string>();
  for (const contact of contacts) {
    const addr = contactToAddressLine(contact);
    if (addr && !seen.has(addr)) {
      seen.add(addr);
      addresses.push(addr);
    }
  }
  return addresses;
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

    let addresses = addressesFromContacts(result.data.contacts);
    if (addresses.length === 0) {
      const allResult = await getContacts(ctx.locationId, credentials, { limit: 100 });
      if (allResult.ok && allResult.data.contacts.length > 0) {
        addresses = addressesFromContacts(allResult.data.contacts);
      }
    }

    if (addresses.length === 0) {
      return NextResponse.json({ coordinates: [], addresses: [] });
    }

    const normalized = addresses.map((a) => normalizeAddressForHash(a));
    const hashes = normalized.map((n) => hashAddress(n));
    const addressByHash = new Map<string, string>();
    hashes.forEach((h, i) => addressByHash.set(h, addresses[i]));

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
    const paired = addresses.map((addr, i) => ({
      address: addr,
      coord: cacheMap.get(hashes[i]) ?? null,
    }));
    const filtered = pinnedNorm
      ? paired.filter((p) => p.address.trim().toLowerCase() !== pinnedNorm)
      : paired;
    const coordinates = filtered
      .map((p) => p.coord)
      .filter((c): c is { lat: number; lng: number } => c != null);
    const addressesOut = filtered.map((p) => p.address);

    return NextResponse.json({
      coordinates,
      addresses: addressesOut,
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
