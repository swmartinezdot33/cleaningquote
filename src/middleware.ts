import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, GHL_SESSION_COOKIE } from '@/lib/ghl/session';

// #region agent log
function debugLog(message: string, data: Record<string, unknown>) {
  fetch('http://127.0.0.1:7242/ingest/cfb75c6a-ee25-465d-8d86-66ea4eadf2d3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: 'middleware.ts', message, data, timestamp: Date.now() }),
  }).catch(() => {});
}
// #endregion

// Dashboard auth: GHL session or allow /dashboard/setup; else redirect to authorize or open-from-ghl. See GHL_IFRAME_APP_AUTH.md.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname, search } = request.nextUrl;
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard');

  console.log('[CQ Middleware] request', { pathname, isDashboard });

  if (isDashboard) {
    // Check for valid marketplace session (OAuth install)
    const sessionToken = request.cookies.get(GHL_SESSION_COOKIE)?.value;
    if (sessionToken) {
      const session = await verifySessionToken(sessionToken);
      if (session) {
        console.log('[CQ Middleware] → ALLOW (session valid)', { pathname, locationId: session.locationId?.slice(0, 12) + '...' });
        const reqHeaders = new Headers(request.headers);
        reqHeaders.set('x-ghl-session', '1');
        return NextResponse.next({
          request: { headers: reqHeaders },
        });
      }
      console.log('[CQ Middleware] → cookie present but INVALID', { pathname });
    }

    // GHL-only: allow API requests with locationId (client passes from decrypted GHL context)
    if (pathname.startsWith('/api/') && request.nextUrl.searchParams.has('locationId')) {
      console.log('[CQ Middleware] → ALLOW (API with locationId)');
      return NextResponse.next();
    }

    // GHL-only: allow /dashboard/setup without session so iframe can get locationId and show "Install via OAuth"
    if (pathname === '/dashboard/setup') {
      console.log('[CQ Middleware] → ALLOW (setup page, no session required)');
      return NextResponse.next();
    }

    // GHL-only: no Supabase fallback — require GHL session for all other dashboard routes
    if (pathname.startsWith('/api/')) {
      console.log('[CQ Middleware] → 401 (dashboard API, no session)');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Open CleanQuote from your GoHighLevel dashboard.' },
        { status: 401 }
      );
    }
    // Local dev: allow /dashboard with ?locationId=... so you can test user context without a real GHL iframe
    const host = request.headers.get('host') ?? '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const hasLocationIdInQuery = request.nextUrl.searchParams.has('locationId') || request.nextUrl.searchParams.has('location_id');
    if (isLocalhost && hasLocationIdInQuery && (pathname.startsWith('/dashboard') || pathname === '/dashboard')) {
      console.log('[CQ Middleware] → ALLOW (localhost + locationId in query, dev test)');
      return NextResponse.next();
    }

    const referer = request.headers.get('referer') || '';
    const hasGhlParam = request.nextUrl.searchParams.get('ghl') === '1';
    const isFromGHL = hasGhlParam || /gohighlevel|leadconnectorhq|cleanquote\.io|ricochetbusinesssolutions/i.test(referer);
    const locationIdFromReferrer = (() => {
      if (!referer) return null;
      try {
        const url = new URL(referer);
        const fromPath = url.pathname.match(/\/(?:v\d+\/)?location\/([^/]+)/i);
        if (fromPath?.[1]) return fromPath[1];
        return url.searchParams.get('locationId') ?? url.searchParams.get('location_id') ?? null;
      } catch {
        return null;
      }
    })();
    const locationId = request.nextUrl.searchParams.get('locationId') ?? request.nextUrl.searchParams.get('location_id') ?? locationIdFromReferrer;
    console.log('[CQ Middleware] → NO SESSION', { pathname, hasCookie: !!sessionToken, isFromGHL, locationId: locationId ? locationId.slice(0, 12) + '...' : null });
    // #region agent log
    debugLog('Redirect to open-from-ghl or authorize', {
      pathname,
      hasSessionCookie: !!sessionToken,
      isFromGHL,
      referer: referer ? referer.slice(0, 80) : null,
    });
    // #endregion
    if (isFromGHL) {
      const oauthUrl = new URL('/api/auth/oauth/authorize', request.url);
      oauthUrl.searchParams.set('redirect', pathname + search || '/dashboard');
      if (locationId) oauthUrl.searchParams.set('locationId', locationId);
      console.log('[CQ Middleware] → REDIRECT to authorize', { hasLocationId: !!locationId });
      return NextResponse.redirect(oauthUrl);
    }
    console.log('[CQ Middleware] → REDIRECT to /open-from-ghl');
    return NextResponse.redirect(new URL('/open-from-ghl', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*'],
};
