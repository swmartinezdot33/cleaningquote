/**
 * GET /api/ghl/logo-swap-config?locationId=xxx
 *
 * Returns whether to apply the sidebar logo swap for this location and the logo URL to use.
 * - Allowlist: location IDs from a published Google Sheet CSV (GHL_LOGO_SWAP_ALLOWLIST_URL).
 * - Logo: always the GHL business logo from GET /locations/{id} (business.logoUrl).
 *
 * Response: { applyLogoSwap: boolean, logoUrl?: string | null }
 */

import { NextResponse } from 'next/server';
import { getLocationTokenFromAgency } from '@/lib/ghl/agency';
import { getLocationWithToken } from '@/lib/ghl/client';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
};

function parseAllowlistCsv(text: string): Set<string> {
  const ids = new Set<string>();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const firstCell = lines[i].split(',')[0].trim();
    if (!firstCell) continue;
    const lower = firstCell.toLowerCase();
    if (lower === 'locationid' || lower === 'location id' || lower === 'location_id') continue;
    if (/^[a-zA-Z0-9]{10,40}$/.test(firstCell)) ids.add(firstCell);
  }
  return ids;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId')?.trim();
    if (!locationId) {
      return NextResponse.json(
        { applyLogoSwap: false, error: 'locationId required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const allowlistUrl = process.env.GHL_LOGO_SWAP_ALLOWLIST_URL?.trim();
    if (!allowlistUrl) {
      return NextResponse.json(
        { applyLogoSwap: false },
        { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=60' } }
      );
    }

    const res = await fetch(allowlistUrl, {
      next: { revalidate: 300 },
      headers: { Accept: 'text/csv, text/plain' },
    });
    if (!res.ok) {
      console.warn('[logo-swap-config] Allowlist fetch failed:', res.status, allowlistUrl);
      return NextResponse.json(
        { applyLogoSwap: false },
        { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=60' } }
      );
    }
    const csv = await res.text();
    const allowlist = parseAllowlistCsv(csv);
    if (!allowlist.has(locationId)) {
      return NextResponse.json(
        { applyLogoSwap: false },
        { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=60' } }
      );
    }

    const tokenResult = await getLocationTokenFromAgency(locationId);
    if (!tokenResult.success || !tokenResult.accessToken) {
      return NextResponse.json(
        { applyLogoSwap: true, logoUrl: null },
        { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' } }
      );
    }

    const location = await getLocationWithToken(locationId, tokenResult.accessToken);
    const logoUrl =
      location?.business?.logoUrl && location.business.logoUrl.trim()
        ? location.business.logoUrl.trim()
        : null;

    return NextResponse.json(
      { applyLogoSwap: true, logoUrl },
      { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=300' } }
    );
  } catch (err) {
    console.warn('[logo-swap-config] Error:', err);
    return NextResponse.json(
      { applyLogoSwap: false },
      { status: 200, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
