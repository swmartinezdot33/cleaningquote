import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Base URL for OAuth redirects (match Vercel or local port)
 */
function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

/**
 * GET /api/auth/oauth/authorize
 * Initiates GHL OAuth flow — matches MaidCentral exactly.
 * Uses GHL_REDIRECT_URI (must be .../api/auth/oauth/callback in GHL Marketplace).
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GHL_CLIENT_ID;
    const baseUrl = getAppBaseUrl();
    const redirectUri =
      process.env.GHL_REDIRECT_URI?.trim() ||
      `${baseUrl}/api/auth/oauth/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: 'GHL_CLIENT_ID is not configured' },
        { status: 500 }
      );
    }

    // Extract version_id from client_id (format: version_id-suffix)
    const versionId = clientId.includes('-') ? clientId.split('-')[0] : clientId;
    const locationId = request.nextUrl.searchParams.get('locationId');

    console.log('[OAuth Authorize] Initiating OAuth flow');
    console.log('[OAuth Authorize] Redirect URI:', redirectUri);
    console.log('[OAuth Authorize] Location ID (hint):', locationId || 'none');

    // GHL OAuth chooselocation — same as MaidCentral
    const authUrl = new URL('https://marketplace.gohighlevel.com/oauth/chooselocation');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('version_id', versionId);
    authUrl.searchParams.set('prompt', 'consent');

    // Scopes: GHL expects + between scopes. Build URL manually to preserve + signs.
    // URLSearchParams encodes + as %2B; MaidCentral appends scope separately.
    const scopes = [
      'locations.readonly',
      'contacts.readonly',
      'contacts.write',
      'calendars.readonly',
      'calendars.write',
      'calendars/events.readonly',
      'calendars/events.write',
      'calendars/groups.readonly',
      'calendars/groups.write',
      'calendars/resources.readonly',
      'calendars/resources.write',
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

    // Append scope with literal + signs (matches MaidCentral)
    const finalAuthUrl = `${authUrl.origin}${authUrl.pathname}?${params.toString()}&scope=${encodedScopes}`;

    return NextResponse.redirect(finalAuthUrl);
  } catch (error) {
    console.error('[OAuth Authorize] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
