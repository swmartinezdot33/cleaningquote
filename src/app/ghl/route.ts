/**
 * Redirect to /app (marketplace Live URL can't contain "ghl")
 */
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL('/app', request.url);
  request.nextUrl.searchParams.forEach((v, k) => url.searchParams.set(k, v));
  return NextResponse.redirect(url);
}
