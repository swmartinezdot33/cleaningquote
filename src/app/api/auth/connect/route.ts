/**
 * Redirect to GHL Marketplace app page for install/connect.
 * Old links to /api/auth/connect now send users to the official marketplace app URL.
 */
import { NextResponse } from 'next/server';
import { getGHLMarketplaceAppUrl } from '@/lib/ghl/oauth-utils';

export async function GET() {
  return NextResponse.redirect(getGHLMarketplaceAppUrl());
}
