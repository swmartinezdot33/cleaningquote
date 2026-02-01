import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getFormSettings, setFormSettings } from '@/lib/kv';

export const dynamic = 'force-dynamic';

/** GET - Get form settings for this tool */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const formSettings = await getFormSettings(toolId);
    return NextResponse.json({ formSettings: formSettings ?? {} });
  } catch (err) {
    console.error('GET dashboard form-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get form settings' },
      { status: 500 }
    );
  }
}

/** POST - Save form settings for this tool */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const existing = (await getFormSettings(toolId)) ?? {};
    const settings: Record<string, unknown> = { ...existing };
    const keys = [
      'firstNameParam',
      'lastNameParam',
      'emailParam',
      'phoneParam',
      'addressParam',
    ] as const;
    for (const key of keys) {
      if (body[key] != null && typeof body[key] === 'string' && body[key].trim()) {
        settings[key] = body[key].trim();
      }
    }
    // Accept boolean or string 'true'/'false' (form state stores as string)
    if (typeof body.openSurveyInNewTab === 'boolean') {
      settings.openSurveyInNewTab = body.openSurveyInNewTab;
    } else if (body.openSurveyInNewTab === 'true') {
      settings.openSurveyInNewTab = true;
    } else if (body.openSurveyInNewTab === 'false') {
      settings.openSurveyInNewTab = false;
    }
    let dnsInstructions: { cname: { name: string; value: string }; a: { name: string; value: string } } | undefined;
    if (body.publicBaseUrl !== undefined) {
      const raw = typeof body.publicBaseUrl === 'string' ? body.publicBaseUrl.trim() : '';
      settings.publicBaseUrl = raw || undefined;

      // Automatically add custom domain to Vercel when user sets a custom URL
      if (raw) {
        try {
          const u = new URL(raw);
          const hostname = u.hostname;
          const token = process.env.VERCEL_TOKEN?.trim();
          const projectId = process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim();
          const teamId = process.env.VERCEL_TEAM_ID?.trim();

          if (token && projectId && hostname && !hostname.endsWith('.vercel.app')) {
            const vercelUrl = new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains`);
            if (teamId) vercelUrl.searchParams.set('teamId', teamId);

            const vercelRes = await fetch(vercelUrl.toString(), {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: hostname }),
            });
            await vercelRes.json().catch(() => null); // Consume body

            const sub = hostname.startsWith('www.') ? 'www' : hostname.split('.')[0] || 'quote';
            dnsInstructions = {
              cname: { name: sub, value: 'cname.vercel-dns.com' },
              a: { name: sub, value: '76.76.21.21' },
            };
            // Always return DNS instructions when we have a custom domain
            // (added successfully, already exists, or failed - user may still need them)
          }
        } catch (domainErr) {
          console.warn('Vercel domain add (non-blocking):', domainErr);
          // Save anyway - don't block the user
        }
      }
    }
    await setFormSettings(settings, toolId);
    return NextResponse.json({
      success: true,
      message: 'Form settings saved',
      ...(dnsInstructions && { dnsInstructions }),
    });
  } catch (err) {
    console.error('POST dashboard form-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save form settings' },
      { status: 500 }
    );
  }
}
