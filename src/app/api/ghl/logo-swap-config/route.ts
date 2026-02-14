/**
 * GET /api/ghl/logo-swap-config?locationId=xxx
 *
 * Returns whether to apply the sidebar logo swap for this location and the logo URL to use.
 * - Allowlist: location IDs from a published Google Sheet CSV (GHL_LOGO_SWAP_ALLOWLIST_URL).
 * - Logo: GHL business logo from GET /locations/:locationId (Get Sub-Account) response field business.logoUrl.
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

/** Extract and validate business.logoUrl from GET /locations/:id (Get Sub-Account) response. */
function normalizeLogoUrl(raw: string | undefined | null): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return null;
  return url;
}

/**
 * If the URL is a Google Sheet edit/view URL, return the CSV export URL so the allowlist fetch works.
 * Pasting the link from the browser address bar (edit?gid=0) returns HTML; export?format=csv returns CSV.
 */
function normalizeAllowlistUrl(url: string): string {
  const u = url.trim();
  if (!u || !/^https?:\/\//i.test(u)) return u;
  const match = u.match(/^(https?:\/\/[^/]+)\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/(edit|view)(\?[^#]*)?(#.*)?$/i);
  if (!match) return u;
  const [, origin, sheetId, , query = '', hash = ''] = match;
  const gidMatch = (query + hash).match(/[?&#]gid=(\d+)/i);
  const gid = gidMatch ? gidMatch[1] : '0';
  return `${origin}/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

function parseAllowlistCsv(text: string): Set<string> {
  const ids = new Set<string>();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const firstCell = lines[i].split(',')[0].trim();
    if (!firstCell) continue;
    const lower = firstCell.toLowerCase();
    if (lower === 'locationid' || lower === 'location id' || lower === 'location_id') continue;
    if (/^[a-zA-Z0-9\-]{10,50}$/.test(firstCell)) ids.add(firstCell);
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

    let allowlistUrl = process.env.GHL_LOGO_SWAP_ALLOWLIST_URL?.trim();
    if (!allowlistUrl) {
      return NextResponse.json(
        { applyLogoSwap: false },
        { status: 200, headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=60' } }
      );
    }
    allowlistUrl = normalizeAllowlistUrl(allowlistUrl);

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
    const rawLogo =
      (location && typeof location === 'object' && location.business && typeof location.business === 'object')
        ? (location.business as { logoUrl?: string }).logoUrl
        : undefined;
    const logoUrl = normalizeLogoUrl(rawLogo);

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
