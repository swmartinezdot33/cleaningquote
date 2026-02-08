import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Base URL for OAuth redirects (match Vercel or local port) */
function getAppBaseUrl(): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const port = process.env.PORT || '3000';
  return `http://localhost:${port}`;
}

/**
 * GET /api/auth/oauth/authorize
 * Initiates GHL OAuth flow (matches MaidCentral).
 * Uses GHL_OAUTH_REDIRECT_URI or APP_BASE_URL + /api/auth/oauth/callback.
 */
export async function GET(request: NextRequest) {
  try {
    const clientId = process.env.GHL_CLIENT_ID;
    const baseUrl = getAppBaseUrl();
    const redirectUri =
      process.env.GHL_OAUTH_REDIRECT_URI ||
      process.env.GHL_REDIRECT_URI?.replace(/\/api\/auth\/connect\/callback$/, '/api/auth/oauth/callback') ||
      `${baseUrl}/api/auth/oauth/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: 'GHL_CLIENT_ID is not configured' },
        { status: 500 }
      );
    }

    const versionId = clientId.includes('-') ? clientId.split('-')[0] : clientId;
    const locationId = request.nextUrl.searchParams.get('locationId');

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
      'opportunities.readonly',
      'opportunities.write',
    ].map((s) => encodeURIComponent(s)).join('+');
    authUrl.searchParams.set('scope', scopes);

    if (locationId) {
      try {
        authUrl.searchParams.set('state', Buffer.from(JSON.stringify({ locationId })).toString('base64'));
      } catch {
        authUrl.searchParams.set('state', JSON.stringify({ locationId }));
      }
    }

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('[OAuth Authorize] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
