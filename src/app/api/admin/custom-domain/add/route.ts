import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/security/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/custom-domain/add
 *
 * Add a custom domain to the Vercel project via the Vercel REST API.
 * Requires: VERCEL_API_TOKEN (Vercel account token), VERCEL_PROJECT_ID (or project name)
 *
 * Body: { domain: "quote.customer.com" }
 *
 * Returns: success, DNS instructions for the customer, and verification status.
 */
export async function POST(request: NextRequest) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) return authResponse;

  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token) {
    return NextResponse.json(
      { error: 'VERCEL_TOKEN is not configured. Add a Vercel account token in Environment Variables.' },
      { status: 500 }
    );
  }

  if (!projectId) {
    return NextResponse.json(
      { error: 'VERCEL_PROJECT_ID or VERCEL_PROJECT_NAME is not configured. Set one in Environment Variables.' },
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

  // Basic domain format check
  try {
    new URL(`https://${domain}`);
  } catch {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  const url = new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains`);
  if (teamId) url.searchParams.set('teamId', teamId);

  try {
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: domain }),
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

    // Vercel returns: name, apexName, projectId, verified, verification, redirect, etc.
    const verified = data.verified === true;
    const verification = data.verification || [];
    const sub = domain.startsWith('www.') ? 'www' : domain.split('.')[0] || 'quote';
    let cnameValue = 'cname.vercel-dns.com';
    let aValue = '76.76.21.21';

    // Fetch domain config for exact DNS values
    const projectId = process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim();
    const teamId = process.env.VERCEL_TEAM_ID?.trim();
    const configUrl = new URL(`https://api.vercel.com/v6/domains/${encodeURIComponent(domain)}/config`);
    if (projectId) configUrl.searchParams.set('projectIdOrName', projectId);
    if (teamId) configUrl.searchParams.set('teamId', teamId);
    try {
      const configRes = await fetch(configUrl.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const configData = (await configRes.json().catch(() => ({}))) as {
        recommendedCNAME?: Array<{ rank?: number; value?: string }>;
        recommendedIPv4?: Array<{ rank?: number; value?: string[] }>;
      };
      if (configRes.ok && configData.recommendedCNAME?.length) {
        const cnameRec = configData.recommendedCNAME.find((r) => r.rank === 1) || configData.recommendedCNAME[0];
        if (cnameRec?.value) cnameValue = cnameRec.value;
      }
      if (configRes.ok && configData.recommendedIPv4?.length) {
        const aRec = configData.recommendedIPv4.find((r) => r.rank === 1) || configData.recommendedIPv4[0];
        if (aRec?.value?.[0]) aValue = aRec.value[0];
      }
    } catch {
      // Fall back to generic values
    }

    return NextResponse.json({
      success: true,
      domain: data.name,
      apexName: data.apexName,
      verified,
      message: verified
        ? 'Domain added and verified. Customer can now add DNS records and set Public link base URL.'
        : 'Domain added. Customer must add DNS records to verify.',
      dnsInstructions: {
        cname: { type: 'CNAME', host: sub, value: cnameValue, ttl: '60' },
        a: { type: 'A', host: sub, value: aValue, ttl: '60' },
      },
      verification:
        verification.length > 0
          ? verification.map((v: { type?: string; domain?: string; value?: string; reason?: string }) => ({
              type: v.type,
              domain: v.domain,
              value: v.value,
              reason: v.reason,
            }))
          : undefined,
    });
  } catch (err) {
    console.error('Custom domain add error:', err);
    return NextResponse.json(
      {
        error: 'Failed to add domain',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
