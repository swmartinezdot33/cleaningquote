import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, GHL_SESSION_COOKIE } from '@/lib/ghl/session';

// Dashboard auth: use postMessage context (locationId) for token lookup; session cookie is optional.
// Allow dashboard when from GHL so the iframe loads and sends locationId on every API call; token comes from KV.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname, search } = request.nextUrl;
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard');

  if (isDashboard) {
    const sessionToken = request.cookies.get(GHL_SESSION_COOKIE)?.value;
    if (sessionToken) {
      const session = await verifySessionToken(sessionToken);
      if (session) {
        const reqHeaders = new Headers(request.headers);
        reqHeaders.set('x-ghl-session', '1');
        return NextResponse.next({
          request: { headers: reqHeaders },
        });
      }
    }

    // API: allow when client sends locationId (from postMessage / iframe context). Token is resolved from KV by locationId.
    if (pathname.startsWith('/api/') && (request.nextUrl.searchParams.has('locationId') || request.headers.get('x-ghl-location-id'))) {
      return NextResponse.next();
    }

    if (pathname === '/dashboard/setup') {
      return NextResponse.next();
    }

    // API without locationId → ask client to open from GHL so context is available
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Open CleanQuote from your GoHighLevel dashboard.' },
        { status: 401 }
      );
    }

    const host = request.headers.get('host') ?? '';
    const isLocalhost = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    const hasLocationIdInQuery = request.nextUrl.searchParams.has('locationId') || request.nextUrl.searchParams.has('location_id');
    if (isLocalhost && hasLocationIdInQuery && (pathname.startsWith('/dashboard') || pathname === '/dashboard')) {
      return NextResponse.next();
    }

    const referer = request.headers.get('referer') || '';
    const hasGhlParam = request.nextUrl.searchParams.get('ghl') === '1';
    const isFromGHL = hasGhlParam || /gohighlevel|leadconnectorhq|cleanquote\.io|ricochetbusinesssolutions/i.test(referer);
    // From GHL (iframe): allow dashboard pages to load. Context (locationId) comes from postMessage; API calls send it and token is looked up from KV.
    if (isFromGHL) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL('/open-from-ghl', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*'],
};
