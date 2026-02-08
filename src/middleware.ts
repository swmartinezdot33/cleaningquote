import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { verifySessionToken, GHL_SESSION_COOKIE } from '@/lib/ghl/session';

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
        // Valid marketplace session — allow through, mark for layout
        const reqHeaders = new Headers(request.headers);
        reqHeaders.set('x-ghl-session', '1');
        return NextResponse.next({
          request: { headers: reqHeaders },
        });
      }
    }

    // Fall back to Supabase auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Please sign in.' },
          { status: 401 }
        );
      }
      const referer = request.headers.get('referer') || '';
      const hasGhlParam = request.nextUrl.searchParams.get('ghl') === '1';
      if (hasGhlParam || /gohighlevel|leadconnectorhq/i.test(referer)) {
        const oauthUrl = new URL('/api/auth/oauth/authorize', request.url);
        oauthUrl.searchParams.set('redirect', pathname + search || '/dashboard');
        return NextResponse.redirect(oauthUrl);
      }
      const redirectTo = pathname + search;
      const redirect = new URL('/login', request.url);
      redirect.searchParams.set('redirect', redirectTo);
      return NextResponse.redirect(redirect);
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            const opts = { ...options } as Record<string, unknown>;
            if (name.startsWith('sb-')) {
              opts.sameSite = 'none';
              opts.secure = true;
            }
            response.cookies.set(name, value, opts);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Please sign in.' },
          { status: 401 }
        );
      }
      // Coming from GHL (iframe, app launch, or ?ghl=1) without session → send to OAuth install instead of login
      const referer = request.headers.get('referer') || '';
      const hasGhlParam = request.nextUrl.searchParams.get('ghl') === '1';
      const isFromGHL = hasGhlParam || /gohighlevel|leadconnectorhq/i.test(referer);
      if (isFromGHL) {
        const oauthUrl = new URL('/api/auth/oauth/authorize', request.url);
        oauthUrl.searchParams.set('redirect', pathname + search || '/dashboard');
        return NextResponse.redirect(oauthUrl);
      }
      const redirectTo = pathname + search;
      const redirect = new URL('/login', request.url);
      redirect.searchParams.set('redirect', redirectTo);
      return NextResponse.redirect(redirect);
    }
    // Pass checkout=success to layout so we can show a message or avoid redirecting to /subscribe
    if (pathname.startsWith('/dashboard') && !pathname.startsWith('/api/') && request.nextUrl.searchParams.get('checkout') === 'success') {
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('x-checkout-success', '1');
      const nextRes = NextResponse.next({
        request: { headers: reqHeaders },
      });
      // Preserve Set-Cookie from supabase session
      const setCookies = response.headers.getSetCookie?.();
      if (setCookies?.length) setCookies.forEach((c) => nextRes.headers.append('Set-Cookie', c));
      response = nextRes;
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/dashboard/:path*'],
};
