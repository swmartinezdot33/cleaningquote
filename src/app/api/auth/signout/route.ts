import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { NextResponse } from 'next/server';
import { getSiteUrl } from '@/lib/canonical-url';

export async function POST(_request: Request) {
  const supabase = await createSupabaseServerSSR();
  await supabase.auth.signOut();
  const baseUrl = getSiteUrl();
  return NextResponse.redirect(new URL('/login', baseUrl), 302);
}
