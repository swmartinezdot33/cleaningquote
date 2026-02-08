import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl, getRedirectUri, GHL_MARKETPLACE_APP_URL_DEFAULT } from '@/lib/ghl/oauth-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/oauth/authorize
 * Redirects to GHL chooselocation with state (locationId + redirect). See GHL_IFRAME_APP_AUTH.md.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GHL_CLIENT_ID;
    const appBaseUrl = getAppBaseUrl();
    const redirectUri = getRedirectUri(appBaseUrl);

    if (!clientId) {
      return NextResponse.json(
        { error: 'GHL_CLIENT_ID is not configured' },
        { status: 500 }
      );
    }

    // Extract version_id from client_id (format: version_id-suffix) — required for marketplace apps
    const versionId = clientId.includes('-') ? clientId.split('-')[0] : clientId;

    // Get locationId and redirect from query (optional). Pass through state so callback can store by locationId and redirect user (GHL template + iframe flow).
    const locationId = request.nextUrl.searchParams.get('locationId');
    const redirect = request.nextUrl.searchParams.get('redirect');

    // GHL OAuth authorization URL — chooselocation endpoint to force location selection
    const authUrl = new URL('https://marketplace.leadconnectorhq.com/oauth/chooselocation');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('version_id', versionId);
    authUrl.searchParams.set('prompt', 'consent');

    // Use scope from default install URL so we match GHL Marketplace app settings (full scope list).
    const defaultInstallUrl = new URL(GHL_MARKETPLACE_APP_URL_DEFAULT);
    const scopeParam = defaultInstallUrl.searchParams.get('scope');
    const encodedScopes = scopeParam ?? [
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
    ].map((scope) => encodeURIComponent(scope)).join('+');

    // Store locationId and redirect in state so callback can use them — same pattern as GHL template + iframe; state = base64(JSON)
    const stateData: { locationId?: string; redirect?: string } = {};
    if (locationId) stateData.locationId = locationId;
    if (redirect && redirect.startsWith('/')) stateData.redirect = redirect;
    if (Object.keys(stateData).length > 0) {
      try {
        const stateString = JSON.stringify(stateData);
        const stateBase64 = Buffer.from(stateString).toString('base64');
        authUrl.searchParams.set('state', stateBase64);
      } catch (e) {
        console.warn('[OAuth Authorize] Failed to encode state as base64, using JSON string:', e);
        authUrl.searchParams.set('state', JSON.stringify(stateData));
      }
    }

    // Build final URL with scope appended (preserve + in scope; URLSearchParams would encode as %2B)
    const oauthBaseUrl = authUrl.origin + authUrl.pathname;
    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', clientId);
    params.set('redirect_uri', redirectUri);
    params.set('version_id', versionId);
    params.set('prompt', 'consent');
    if (Object.keys(stateData).length > 0) {
      try {
        const stateString = JSON.stringify(stateData);
        const stateBase64 = Buffer.from(stateString).toString('base64');
        params.set('state', stateBase64);
      } catch (e) {
        params.set('state', JSON.stringify(stateData));
      }
    }
    const finalAuthUrl = `${oauthBaseUrl}?${params.toString()}&scope=${encodedScopes}`;

    if (!redirectUri.includes('/api/auth/connect/callback') && !redirectUri.includes('/api/auth/oauth/callback')) {
      console.error('[OAuth Authorize] WARNING: Redirect URI should be /api/auth/connect/callback (or oauth/callback). Set GHL_REDIRECT_URI in GHL marketplace app settings.');
    }

    const res = NextResponse.redirect(finalAuthUrl);
    if (locationId) {
      res.cookies.set('ghl_pending_location_id', locationId, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/' });
    }
    return res;
  } catch (error) {
    console.error('Error initiating GHL OAuth:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
