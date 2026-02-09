import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/canonical-url';

/**
 * Auth callback for legacy Supabase magic link / email confirmation.
 * CleanQuote uses GHL for sign-in; if exchange fails or no code, send user to open-from-ghl.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const baseUrl = getSiteUrl();

  if (code) {
    try {
      const supabase = await createSupabaseServerSSR();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${baseUrl}${next}`);
      }
    } catch {
      // fall through to open-from-ghl
    }
  }

  return NextResponse.redirect(`${baseUrl}/open-from-ghl`);
}
