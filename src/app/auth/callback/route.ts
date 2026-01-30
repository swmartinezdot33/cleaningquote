import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { NextResponse } from 'next/server';

/**
 * Auth callback for OAuth, magic link, and email confirmation redirects.
 * Exchanges code for session and redirects to ?next= or /dashboard.
 * Uses NEXT_PUBLIC_APP_URL when set (e.g. https://www.cleanquote.io) for canonical redirects.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  if (code) {
    const supabase = await createSupabaseServerSSR();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
}
