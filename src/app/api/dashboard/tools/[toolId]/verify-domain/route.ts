import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getFormSettings } from '@/lib/kv';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dashboard/tools/[toolId]/verify-domain
 *
 * Verify custom domain DNS records with Vercel.
 * Returns whether the domain is verified and any verification details.
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token || !projectId) {
    return NextResponse.json(
      { error: 'Domain verification is not configured. Contact support.' },
      { status: 503 }
    );
  }

  try {
    const formSettings = await getFormSettings(toolId);
    const raw = typeof formSettings?.publicBaseUrl === 'string' ? formSettings.publicBaseUrl.trim() : '';
    if (!raw) {
      return NextResponse.json(
        { error: 'No custom domain set. Save a Public link base URL first.' },
        { status: 400 }
      );
    }

    const u = new URL(raw);
    const hostname = u.hostname;
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.vercel.app')) {
      return NextResponse.json(
        { error: 'Public link base URL is not a custom domain. Verification only applies to custom domains.' },
        { status: 400 }
      );
    }

    const url = new URL(
      `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(hostname)}/verify`
    );
    if (teamId) url.searchParams.set('teamId', teamId);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = (await res.json().catch(() => ({}))) as {
      verified?: boolean;
      verification?: Array<{ type?: string; domain?: string; value?: string; reason?: string }>;
      error?: { message?: string };
    };

    if (!res.ok) {
      const msg = data.error?.message || `HTTP ${res.status}`;
      return NextResponse.json(
        { error: msg, verified: false },
        { status: res.status >= 400 && res.status < 500 ? res.status : 500 }
      );
    }

    const verified = data.verified === true;
    return NextResponse.json({
      success: true,
      domain: hostname,
      verified,
      message: verified
        ? 'DNS records verified. SSL will be provisioned automatically.'
        : 'DNS records not yet verified. Check that records match and allow 5–60 minutes for propagation.',
      verification: data.verification,
    });
  } catch (err) {
    console.error('Verify domain error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to verify domain' },
      { status: 500 }
    );
  }
}
