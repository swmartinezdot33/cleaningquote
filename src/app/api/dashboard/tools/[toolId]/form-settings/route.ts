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
    const raw = await getFormSettings(toolId);
    const formSettings = raw ?? {};
    // Normalize: expose publicBaseUrls (array); migrate old single publicBaseUrl
    const publicBaseUrls = Array.isArray(formSettings.publicBaseUrls)
      ? formSettings.publicBaseUrls
      : typeof formSettings.publicBaseUrl === 'string' && formSettings.publicBaseUrl.trim()
        ? [formSettings.publicBaseUrl.trim()]
        : [];
    return NextResponse.json({
      formSettings: {
        ...formSettings,
        publicBaseUrls,
        pendingBaseUrl: typeof formSettings.pendingBaseUrl === 'string' ? formSettings.pendingBaseUrl.trim() : undefined,
        domainVerified: formSettings.domainVerified === true,
        domainVerifiedDomain:
          typeof formSettings.domainVerifiedDomain === 'string' ? formSettings.domainVerifiedDomain : undefined,
      },
    });
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

    // Add a new base URL (sets pending, adds domain to Vercel, returns DNS)
    if (body.addBaseUrl !== undefined) {
      const addRaw = typeof body.addBaseUrl === 'string' ? body.addBaseUrl.trim() : '';
      if (!addRaw) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
      }
      let addUrl: URL;
      try {
        addUrl = new URL(addRaw);
        if (addUrl.protocol !== 'https:') {
          return NextResponse.json({ error: 'URL must start with https://' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Please enter a valid URL' }, { status: 400 });
      }
      const hostname = addUrl.hostname;
      if (!hostname || hostname === 'localhost' || hostname.endsWith('.vercel.app')) {
        return NextResponse.json({ error: 'Custom domain required (not localhost or *.vercel.app)' }, { status: 400 });
      }
      const list = (Array.isArray(existing.publicBaseUrls) ? existing.publicBaseUrls : []) as string[];
      const migratedList = list.length > 0 ? list : (typeof existing.publicBaseUrl === 'string' && existing.publicBaseUrl.trim() ? [existing.publicBaseUrl.trim()] : []);
      if (migratedList.includes(addRaw)) {
        return NextResponse.json({ error: 'This URL is already in your list' }, { status: 400 });
      }
      settings.publicBaseUrls = migratedList;
      settings.pendingBaseUrl = addRaw;
      delete settings.domainVerified;
      delete settings.domainVerifiedDomain;

      let vercelDomainErrorAdd: string | undefined;
      const sub = hostname.startsWith('www.') ? 'www' : hostname.split('.')[0] || 'quote';
      let cnameValue = 'cname.vercel-dns.com';
      let aValue = '76.76.21.21';
      const token = process.env.VERCEL_TOKEN?.trim();
      const projectId = process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim();
      const teamId = process.env.VERCEL_TEAM_ID?.trim();
      if (!token || !projectId) {
        vercelDomainErrorAdd = 'VERCEL_TOKEN and VERCEL_PROJECT_ID must be set. Add the domain in Vercel Dashboard → Settings → Domains.';
      } else {
        const vercelUrl = new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains`);
        if (teamId) vercelUrl.searchParams.set('teamId', teamId);
        const vercelRes = await fetch(vercelUrl.toString(), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: hostname }),
        });
        const vercelData = (await vercelRes.json().catch(() => ({}))) as { error?: { message?: string } };
        if (!vercelRes.ok) {
          const msg = vercelData.error?.message || `HTTP ${vercelRes.status}`;
          vercelDomainErrorAdd = msg.includes('already') || vercelRes.status === 409 ? 'Domain may already exist. Add in Vercel if needed.' : msg;
        } else {
          const configUrl = new URL(`https://api.vercel.com/v6/domains/${encodeURIComponent(hostname)}/config`);
          configUrl.searchParams.set('projectIdOrName', projectId);
          if (teamId) configUrl.searchParams.set('teamId', teamId);
          try {
            const configRes = await fetch(configUrl.toString(), { headers: { Authorization: `Bearer ${token}` } });
            const configData = (await configRes.json().catch(() => ({}))) as {
              recommendedCNAME?: Array<{ rank?: number; value?: string }>;
              recommendedIPv4?: Array<{ rank?: number; value?: string[] }>;
            };
            if (configRes.ok && configData.recommendedCNAME?.length) {
              const c = configData.recommendedCNAME.find((r) => r.rank === 1) || configData.recommendedCNAME[0];
              if (c?.value) cnameValue = c.value;
            }
            if (configRes.ok && configData.recommendedIPv4?.length) {
              const a = configData.recommendedIPv4.find((r) => r.rank === 1) || configData.recommendedIPv4[0];
              if (a?.value?.[0]) aValue = a.value[0];
            }
          } catch {}
        }
      }
      const dnsInstructionsAdd = { cname: { type: 'CNAME', host: sub, value: cnameValue, ttl: '60' }, a: { type: 'A', host: sub, value: aValue, ttl: '60' } };
      await setFormSettings(settings, toolId);
      return NextResponse.json({
        success: true,
        message: 'Domain added. Add DNS records, then click Verify.',
        dnsInstructions: dnsInstructionsAdd,
        ...(vercelDomainErrorAdd && { vercelDomainError: vercelDomainErrorAdd }),
      });
    }

    // Remove one base URL from the list and from Vercel
    if (body.removeBaseUrl !== undefined) {
      const removeRaw = typeof body.removeBaseUrl === 'string' ? body.removeBaseUrl.trim() : '';
      if (!removeRaw) {
        return NextResponse.json({ error: 'URL to remove is required' }, { status: 400 });
      }
      const list = (Array.isArray(existing.publicBaseUrls) ? existing.publicBaseUrls : []) as string[];
      const migratedList = list.length > 0 ? list : (typeof existing.publicBaseUrl === 'string' && existing.publicBaseUrl.trim() ? [existing.publicBaseUrl.trim()] : []);
      const nextList = migratedList.filter((u) => u !== removeRaw);
      if (nextList.length === migratedList.length) {
        return NextResponse.json({ error: 'URL not found in list' }, { status: 400 });
      }
      let removeHostname: string | null = null;
      try {
        removeHostname = new URL(removeRaw).hostname;
        if (!removeHostname || removeHostname === 'localhost' || removeHostname.endsWith('.vercel.app')) removeHostname = null;
      } catch {}
      if (removeHostname) {
        const token = process.env.VERCEL_TOKEN?.trim();
        const projectId = process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim();
        const teamId = process.env.VERCEL_TEAM_ID?.trim();
        if (token && projectId) {
          const deleteUrl = new URL(
            `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(removeHostname)}`
          );
          if (teamId) deleteUrl.searchParams.set('teamId', teamId);
          try {
            await fetch(deleteUrl.toString(), { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
          } catch (e) {
            console.warn('Vercel domain remove (non-blocking):', e);
          }
        }
      }
      settings.publicBaseUrls = nextList;
      if (existing.pendingBaseUrl === removeRaw) delete settings.pendingBaseUrl;
      delete settings.domainVerified;
      delete settings.domainVerifiedDomain;
      await setFormSettings(settings, toolId);
      return NextResponse.json({ success: true, message: 'URL removed from setup and from Vercel.' });
    }

    let dnsInstructions: {
      cname: { type: string; host: string; value: string; ttl: string };
      a: { type: string; host: string; value: string; ttl: string };
    } | undefined;
    let vercelDomainAdded = false;
    let vercelDomainError: string | undefined;
    if (body.publicBaseUrl !== undefined) {
      const raw = typeof body.publicBaseUrl === 'string' ? body.publicBaseUrl.trim() : '';
      const previousUrl = typeof existing.publicBaseUrl === 'string' ? existing.publicBaseUrl.trim() : '';
      let previousHostname: string | null = null;
      if (previousUrl) {
        try {
          const prev = new URL(previousUrl);
          const h = prev.hostname;
          if (h && h !== 'localhost' && !h.endsWith('.vercel.app')) previousHostname = h;
        } catch {}
      }
      settings.publicBaseUrl = raw || undefined;
      // Clear persisted verification when domain changes
      delete settings.domainVerified;
      delete settings.domainVerifiedDomain;

      // When user clears the domain, remove it from Vercel
      if (!raw && previousHostname) {
        const token = process.env.VERCEL_TOKEN?.trim();
        const projectId = process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim();
        const teamId = process.env.VERCEL_TEAM_ID?.trim();
        if (token && projectId) {
          const deleteUrl = new URL(
            `https://api.vercel.com/v10/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(previousHostname)}`
          );
          if (teamId) deleteUrl.searchParams.set('teamId', teamId);
          try {
            const delRes = await fetch(deleteUrl.toString(), {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!delRes.ok) {
              console.warn('Vercel domain remove failed:', delRes.status, await delRes.text());
            }
          } catch (err) {
            console.warn('Vercel domain remove (non-blocking):', err);
          }
        }
      }

      // Automatically add custom domain to Vercel when user sets a custom URL
      // Always return DNS instructions so user sees what records to add
      if (raw) {
        try {
          const u = new URL(raw);
          const hostname = u.hostname;
          if (hostname && hostname !== 'localhost' && !hostname.endsWith('.vercel.app')) {
            const sub = hostname.startsWith('www.') ? 'www' : hostname.split('.')[0] || 'quote';
            let cnameValue = 'cname.vercel-dns.com';
            let aValue = '76.76.21.21';

            const token = process.env.VERCEL_TOKEN?.trim();
            const projectId = process.env.VERCEL_PROJECT_ID?.trim() || process.env.VERCEL_PROJECT_NAME?.trim();
            const teamId = process.env.VERCEL_TEAM_ID?.trim();

            if (!token || !projectId) {
              vercelDomainError = 'VERCEL_TOKEN and VERCEL_PROJECT_ID (or VERCEL_PROJECT_NAME) must be set in Vercel Environment Variables. Add the domain manually in Vercel Dashboard → Settings → Domains.';
            } else {
              // Add domain to Vercel
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
              const vercelData = (await vercelRes.json().catch(() => ({}))) as { error?: { message?: string }; verified?: boolean };

              if (vercelRes.ok) {
                vercelDomainAdded = true;
              } else {
                const msg = vercelData.error?.message || `HTTP ${vercelRes.status}`;
                vercelDomainError = msg.includes('already') || vercelRes.status === 409
                  ? 'Domain may already exist on this project. Add it manually in Vercel if needed.'
                  : msg;
                console.warn('Vercel domain add failed:', vercelRes.status, vercelData);
              }

              // Fetch domain config from Vercel for exact DNS values
              const configUrl = new URL(`https://api.vercel.com/v6/domains/${encodeURIComponent(hostname)}/config`);
              configUrl.searchParams.set('projectIdOrName', projectId);
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
            }

            dnsInstructions = {
              cname: { type: 'CNAME', host: sub, value: cnameValue, ttl: '60' },
              a: { type: 'A', host: sub, value: aValue, ttl: '60' },
            };
          }
        } catch (domainErr) {
          vercelDomainError = domainErr instanceof Error ? domainErr.message : 'Failed to add domain to Vercel';
          console.warn('Vercel domain add (non-blocking):', domainErr);
        }
      }
    }
    await setFormSettings(settings, toolId);
    return NextResponse.json({
      success: true,
      message: 'Form settings saved',
      ...(dnsInstructions && { dnsInstructions }),
      ...(vercelDomainAdded && { vercelDomainAdded: true }),
      ...(vercelDomainError && { vercelDomainError }),
    });
  } catch (err) {
    console.error('POST dashboard form-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save form settings' },
      { status: 500 }
    );
  }
}
