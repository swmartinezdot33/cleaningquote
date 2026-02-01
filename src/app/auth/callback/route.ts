import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/canonical-url';

/**
 * Auth callback for OAuth, magic link, and email confirmation redirects.
 * Exchanges code for session and redirects to ?next= or /dashboard.
 * Redirects to canonical domain (https://www.cleanquote.io) so users land on the main site.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const baseUrl = getSiteUrl();

  if (code) {
    const supabase = await createSupabaseServerSSR();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${baseUrl}${next}`);
    }
  }

  return NextResponse.redirect(`${baseUrl}/login?error=auth_callback_error`);
}
