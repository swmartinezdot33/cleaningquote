import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
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

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/dashboard')) {
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
      // Preserve full path including ?checkout=success so after login they land on dashboard?checkout=success
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
