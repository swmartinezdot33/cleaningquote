/**
 * GET /install?locationId=xxx&companyId=yyy
 * Redirects to /api/auth/oauth/authorize with same params so state + KV install session + cookies
 * are set, then GHL OAuth. Open in new tab (target="_blank") so callback preserves cookies.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl } from '@/lib/ghl/oauth-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const locationId = request.nextUrl.searchParams.get('locationId') ?? request.nextUrl.searchParams.get('location_id');
  const companyId = request.nextUrl.searchParams.get('companyId') ?? request.nextUrl.searchParams.get('company_id');
  const baseUrl = getAppBaseUrl();
  const base = baseUrl.replace(/\/$/, '');
  const params = new URLSearchParams();
  if (locationId?.trim()) params.set('locationId', locationId.trim());
  if (companyId?.trim()) params.set('companyId', companyId.trim());
  const authorizeUrl = `${base}/api/auth/oauth/authorize${params.toString() ? `?${params.toString()}` : ''}`;
  return NextResponse.redirect(authorizeUrl);
}
