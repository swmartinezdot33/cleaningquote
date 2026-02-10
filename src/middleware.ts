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

    // Allow all dashboard requests. No redirect — client resolves locationId from iframe and sends it on API calls.
    // When not in iframe, DashboardGHLWrapper shows "Open inside CleanQuote.io". API routes return 401 when locationId is missing.
    return NextResponse.next();
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*'],
};
