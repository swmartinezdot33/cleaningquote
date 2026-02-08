import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl, getRedirectUri } from '@/lib/ghl/oauth-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/oauth/authorize
 * Initiates GHL OAuth flow — matches MaidCentral exactly.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GHL_CLIENT_ID;
    const baseUrl = getAppBaseUrl();
    const redirectUri = getRedirectUri(baseUrl); // Same logic as callback + token-store
    const locationId = request.nextUrl.searchParams.get('locationId');

    console.log('[OAuth Authorize] ============================================');
    console.log('[OAuth Authorize] Initiating OAuth flow');
    console.log('[OAuth Authorize] Client ID:', clientId ? `${clientId.substring(0, 10)}...${clientId.substring(clientId.length - 4)}` : 'MISSING');
    console.log('[OAuth Authorize] Redirect URI:', redirectUri);
    console.log('[OAuth Authorize] Base URL:', baseUrl);
    console.log('[OAuth Authorize] Location ID (hint):', locationId || 'none');
    console.log('[OAuth Authorize]   - APP_BASE_URL:', process.env.APP_BASE_URL || 'NOT SET');
    console.log('[OAuth Authorize]   - GHL_REDIRECT_URI:', process.env.GHL_REDIRECT_URI || 'NOT SET');
    console.log('[OAuth Authorize] ============================================');

    if (!clientId) {
      return NextResponse.json(
        { error: 'GHL_CLIENT_ID is not configured' },
        { status: 500 }
      );
    }

    if (!redirectUri.includes('/api/auth/oauth/callback')) {
      console.error('[OAuth Authorize] ⚠️  Redirect URI must use oauth/callback (matches MaidCentral)');
    }

    const versionId = clientId.includes('-') ? clientId.split('-')[0] : clientId;

    const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('version_id', versionId);
    authUrl.searchParams.set('prompt', 'consent');

    const scopes = [
      'locations.readonly',
      'contacts.readonly',
      'contacts.write',
      'calendars.readonly',
      'calendars.write',
      'calendars/events.readonly',
      'calendars/events.write',
      'calendars/groups.readonly',
      'calendars/resources.write',
      'calendars/groups.write',
      'calendars/resources.readonly',
      'opportunities.readonly',
      'opportunities.write',
    ];
    const encodedScopes = scopes.map((s) => encodeURIComponent(s)).join('+');

    const redirect = request.nextUrl.searchParams.get('redirect') ?? '/oauth-success';
    const orgId = request.nextUrl.searchParams.get('orgId');
    const stateData: { locationId?: string; redirect?: string; orgId?: string } = { redirect };
    if (locationId) stateData.locationId = locationId;
    if (orgId) stateData.orgId = orgId;

    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', clientId);
    params.set('redirect_uri', redirectUri);
    params.set('version_id', versionId);
    params.set('prompt', 'consent');
    if (Object.keys(stateData).length > 0) {
      try {
        params.set('state', Buffer.from(JSON.stringify(stateData)).toString('base64'));
      } catch {
        params.set('state', JSON.stringify(stateData));
      }
    }

    const finalAuthUrl = `${authUrl.origin}${authUrl.pathname}?${params.toString()}&scope=${encodedScopes}`;
    console.log('[OAuth Authorize] Redirecting to GHL OAuth...');

    return NextResponse.redirect(finalAuthUrl);
  } catch (error) {
    console.error('[OAuth Authorize] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
