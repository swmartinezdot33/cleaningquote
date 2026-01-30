import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerSSR();
  await supabase.auth.signOut();
  const url = new URL(request.url);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  return NextResponse.redirect(new URL('/login', baseUrl), 302);
}
