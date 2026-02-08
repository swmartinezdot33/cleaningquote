import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getInstallation } from '@/lib/ghl/token-store';
import { getAppBaseUrl, getRedirectUri } from '@/lib/ghl/oauth-utils';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/oauth
 * Safe debug info for OAuth flow. Check Vercel server logs for full detail; this returns config + session status.
 * Use: open https://your-domain.com/api/debug/oauth (same origin as app) to see if cookie is sent.
 * Add ?locationId=YOUR_LOCATION_ID to check if tokens were stored in KV for that location.
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get('host') ?? 'unknown';
  const hasCookie = request.cookies.has('ghl_session');
  const session = await getSession();
  const appBase = getAppBaseUrl();
  const redirectUri = getRedirectUri(appBase);
  const locationIdParam = request.nextUrl.searchParams.get('locationId');

  let kvCheck: { locationIdHint: string; stored: boolean; error?: string } | null = null;
  if (locationIdParam && locationIdParam.length >= 10) {
    try {
      const install = await getInstallation(locationIdParam);
      kvCheck = {
        locationIdHint: `${locationIdParam.slice(0, 8)}...`,
        stored: !!(install?.accessToken),
      };
    } catch (e) {
      kvCheck = {
        locationIdHint: `${locationIdParam.slice(0, 8)}...`,
        stored: false,
        error: e instanceof Error ? e.message : 'KV lookup failed',
      };
    }
  }

  const info = {
    message: 'OAuth debug — check Vercel Dashboard → your project → Logs for [OAuth Authorize], [OAuth Callback], [OAuth Middleware]',
    request: {
      host,
      hasGhlSessionCookie: hasCookie,
      sessionValid: !!session,
      sessionLocationId: session?.locationId ? `${session.locationId.slice(0, 8)}...` : null,
    },
    ...(kvCheck && { kvCheck }),
    config: {
      hasGHL_CLIENT_ID: !!process.env.GHL_CLIENT_ID,
      hasGHL_CLIENT_SECRET: !!process.env.GHL_CLIENT_SECRET,
      APP_BASE_URL: process.env.APP_BASE_URL ? 'SET' : 'NOT SET',
      GHL_REDIRECT_URI: process.env.GHL_REDIRECT_URI ? 'SET' : 'NOT SET',
      computedAppBase: appBase,
      computedRedirectUri: redirectUri.replace(/client_secret=[^&]+/, 'client_secret=***'),
    },
    howToReadLogs: [
      '1. Vercel Dashboard → your project → Logs (or Deployments → select deployment → Functions)',
      '2. Reproduce: click Install via OAuth, complete flow, then open /dashboard or /open-from-ghl',
      '3. Search logs for "OAuth Authorize" (start), "OAuth Callback" (GHL redirect back), "GHL token-store" (KV write), "OAuth Middleware" (dashboard access)',
      '4. Callback should log REDIRECT TARGET and COOKIE SET; token-store should log "Stored successfully"; Middleware should log either SESSION OK or NO SESSION',
      '5. To check if tokens are in KV: GET /api/debug/oauth?locationId=YOUR_LOCATION_ID (from oauth-success URL or logs). Response includes kvCheck.stored',
    ],
  };

  return NextResponse.json(info, { status: 200 });
}
