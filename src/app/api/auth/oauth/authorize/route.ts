import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAppBaseUrl, getRedirectUri, GHL_MARKETPLACE_APP_URL_DEFAULT } from '@/lib/ghl/oauth-utils';
import { setInstallSession } from '@/lib/ghl/install-session';

export const dynamic = 'force-dynamic';

const COOKIE_OPTS = { httpOnly: true, secure: true, sameSite: 'lax' as const, maxAge: 600, path: '/' };

/**
 * GET /api/auth/oauth/authorize
 * Generates state UUID, stores install session in KV, sets cookies, redirects to GHL chooselocation.
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

    const versionId = clientId.includes('-') ? clientId.split('-')[0] : clientId;
    const locationId = request.nextUrl.searchParams.get('locationId')?.trim() ?? request.nextUrl.searchParams.get('location_id')?.trim() ?? null;
    const companyId = request.nextUrl.searchParams.get('companyId')?.trim() ?? request.nextUrl.searchParams.get('company_id')?.trim() ?? null;
    const redirect = request.nextUrl.searchParams.get('redirect')?.trim() ?? null;

    const state = randomUUID();

    if (locationId) {
      await setInstallSession(state, locationId, companyId);
    }

    const authUrl = new URL('https://marketplace.leadconnectorhq.com/oauth/chooselocation');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('version_id', versionId);
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    const defaultInstallUrl = new URL(GHL_MARKETPLACE_APP_URL_DEFAULT);
    let scopeParam = defaultInstallUrl.searchParams.get('scope');
    if (scopeParam && !/oauth\.(write|readonly)/i.test(scopeParam)) {
      scopeParam = [scopeParam, 'oauth.write', 'oauth.readonly'].filter(Boolean).join('+');
    }
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
      'oauth.write',
      'oauth.readonly',
    ].map((scope) => encodeURIComponent(scope)).join('+');

    const oauthBaseUrl = authUrl.origin + authUrl.pathname;
    const params = new URLSearchParams();
    params.set('response_type', 'code');
    params.set('client_id', clientId);
    params.set('redirect_uri', redirectUri);
    params.set('version_id', versionId);
    params.set('prompt', 'consent');
    params.set('state', state);
    const finalAuthUrl = `${oauthBaseUrl}?${params.toString()}&scope=${encodedScopes}`;

    if (!redirectUri.includes('/api/auth/connect/callback') && !redirectUri.includes('/api/auth/oauth/callback')) {
      console.error('[OAuth Authorize] WARNING: Redirect URI should be /api/auth/connect/callback (or oauth/callback). Set GHL_REDIRECT_URI in GHL marketplace app settings.');
    }

    const res = NextResponse.redirect(finalAuthUrl);
    if (locationId) {
      res.cookies.set('ghl_pending_location_id', locationId, COOKIE_OPTS);
      if (companyId) res.cookies.set('ghl_pending_company_id', companyId, COOKIE_OPTS);
      res.cookies.set('ghl_pending_oauth_state', state, COOKIE_OPTS);
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
