import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Production readiness check. Returns 200 when the app is up.
 * Use for Vercel health checks, load balancers, or monitoring.
 */
export async function GET() {
  const checks: Record<string, boolean | string> = {
    ok: true,
    env: process.env.NODE_ENV ?? 'development',
  };

  // Optional: surface non-secret config presence (no values)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) checks.supabase = true;
  else checks.supabase = false;
  if (process.env.KV_REST_API_URL) checks.kv = true;
  else checks.kv = false;

  return NextResponse.json(checks, { status: 200 });
}
