import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/canonical-url';
import { GHL_SESSION_COOKIE } from '@/lib/ghl/session';

export async function POST(_request: Request) {
  const supabase = await createSupabaseServerSSR();
  await supabase.auth.signOut();
  const baseUrl = getSiteUrl();
  const res = NextResponse.redirect(new URL('/login', baseUrl), 302);
  res.cookies.set(GHL_SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
