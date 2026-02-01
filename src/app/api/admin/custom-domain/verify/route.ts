import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/security/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/custom-domain/verify
 *
 * Verify a custom domain on Vercel after the customer has added DNS records.
 * Requires: VERCEL_TOKEN, VERCEL_PROJECT_ID (or VERCEL_PROJECT_NAME)
 *
 * Body: { domain: "quote.customer.com" }
 *
 * Returns: verification status.
 */
export async function POST(request: NextRequest) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) return authResponse;

  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token) {
    return NextResponse.json(
      { error: 'VERCEL_TOKEN is not configured' },
      { status: 500 }
    );
  }

  if (!projectId) {
    return NextResponse.json(
      { error: 'VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME is not configured' },
      { status: 500 }
    );
  }

  let body: { domain?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const domain = typeof body.domain === 'string' ? body.domain.trim().toLowerCase() : '';
  if (!domain) {
    return NextResponse.json({ error: 'domain is required in body' }, { status: 400 });
  }

  const url = new URL(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(domain)}/verify`
  );
  if (teamId) url.searchParams.set('teamId', teamId);

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.error?.message || data.message || data.error || JSON.stringify(data);
      return NextResponse.json(
        {
          error: `Vercel API error (${res.status}): ${msg}`,
          details: data,
        },
        { status: res.status >= 400 && res.status < 500 ? res.status : 500 }
      );
    }

    const verified = data.verified === true;

    return NextResponse.json({
      success: true,
      domain,
      verified,
      message: verified ? 'Domain verified. SSL will be provisioned automatically.' : 'Domain not yet verified. Ensure DNS records are correct and propagated.',
      verification: data.verification,
    });
  } catch (err) {
    console.error('Custom domain verify error:', err);
    return NextResponse.json(
      {
        error: 'Failed to verify domain',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
