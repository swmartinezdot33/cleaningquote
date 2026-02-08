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

  if (isDashboard) {
    // Check for valid marketplace session (OAuth install)
    const sessionToken = request.cookies.get(GHL_SESSION_COOKIE)?.value;
    if (sessionToken) {
      const session = await verifySessionToken(sessionToken);
      if (session) {
        console.log('[OAuth Middleware] SESSION OK → allowing. pathname=', pathname, '| locationId=', session.locationId?.slice(0, 8) + '...');
        const reqHeaders = new Headers(request.headers);
        reqHeaders.set('x-ghl-session', '1');
        return NextResponse.next({
          request: { headers: reqHeaders },
        });
      }
      console.log('[OAuth Middleware] Cookie present but INVALID → will redirect. pathname=', pathname);
    }

    // GHL-only: allow API requests with locationId (client passes from decrypted GHL context)
    if (pathname.startsWith('/api/') && request.nextUrl.searchParams.has('locationId')) {
      return NextResponse.next();
    }

    // GHL-only: allow /dashboard/setup without session so iframe can get locationId and show "Install via OAuth"
    if (pathname === '/dashboard/setup') {
      return NextResponse.next();
    }

    // GHL-only: no Supabase fallback — require GHL session for all other dashboard routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Open CleanQuote from your GoHighLevel dashboard.' },
        { status: 401 }
      );
    }
    const referer = request.headers.get('referer') || '';
    const hasGhlParam = request.nextUrl.searchParams.get('ghl') === '1';
    const isFromGHL = hasGhlParam || /gohighlevel|leadconnectorhq|cleanquote\.io|ricochetbusinesssolutions/i.test(referer);
    const requestHost = request.headers.get('host') ?? 'unknown';
    console.log('[OAuth Middleware] NO SESSION → redirecting. pathname=', pathname, '| host=', requestHost, '| hasCookie=', !!sessionToken, '| isFromGHL=', isFromGHL, '| referer=', referer ? referer.slice(0, 60) : '(none)');
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
      return NextResponse.redirect(oauthUrl);
    }
    return NextResponse.redirect(new URL('/open-from-ghl', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*'],
};
