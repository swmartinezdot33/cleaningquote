import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/ghl/session';
import { getInstallation, getAgencyToken, getAgencyInstall } from '@/lib/ghl/token-store';

export const dynamic = 'force-dynamic';

function previewToken(token: string | undefined): { length: number; preview: string; full?: string } {
  if (!token || typeof token !== 'string') return { length: 0, preview: '' };
  const len = token.length;
  const preview = len <= 30 ? token : `${token.slice(0, 15)}...${token.slice(-10)}`;
  return { length: len, preview };
}

/**
 * GET /api/debug/ghl-status
 * Load in browser or curl to see current GHL/KV state. No auth required.
 *
 * Query:
 *   ?locationId=xxx   — include KV lookup for this location (key, hasToken, userType, token preview)
 *   ?showToken=1      — (development only) include full accessToken/refreshToken in response. NEVER enable in production.
 */
export async function GET(request: NextRequest) {
  const locationIdParam = request.nextUrl.searchParams.get('locationId')?.trim() ?? null;
  const showToken = request.nextUrl.searchParams.get('showToken') === '1';
  const isDev = process.env.NODE_ENV === 'development';

  const session = await getSession();
  const agencyTokenRaw = await getAgencyToken();
  const agencyInstall = await getAgencyInstall();

  const response: Record<string, unknown> = {
    ok: true,
    timestamp: new Date().toISOString(),
    session: session
      ? {
          locationId: session.locationId ? `${session.locationId.slice(0, 8)}..${session.locationId.slice(-4)}` : null,
          hasLocationId: !!session.locationId,
        }
      : null,
    agencyTokenInKV: !!agencyTokenRaw,
    agencyTokenSource: 'ghl:agency:token (one Agency token per app, stored when Company user completes OAuth; not keyed by locationId)',
    agencyToken: (() => {
      const p = previewToken(agencyTokenRaw ?? undefined);
      if (showToken && isDev && agencyTokenRaw) (p as Record<string, unknown>).full = agencyTokenRaw;
      return p;
    })(),
    agencyInstall: agencyInstall
      ? {
          hasAccessToken: !!agencyInstall.accessToken,
          hasRefreshToken: !!agencyInstall.refreshToken,
          companyId: agencyInstall.companyId ? `${agencyInstall.companyId.slice(0, 8)}..${agencyInstall.companyId.slice(-4)}` : null,
          expiresAt: agencyInstall.expiresAt,
          expiresAtISO: agencyInstall.expiresAt ? new Date(agencyInstall.expiresAt).toISOString() : null,
          ...(showToken && isDev
            ? {
                accessToken: agencyInstall.accessToken,
                refreshToken: agencyInstall.refreshToken,
                companyId: agencyInstall.companyId,
              }
            : {}),
        }
      : null,
  };

  if (locationIdParam) {
    const install = await getInstallation(locationIdParam);
    const accessPreview = previewToken(install?.accessToken);
    const refreshPreview = previewToken(install?.refreshToken);
    if (showToken && isDev && install) {
      (accessPreview as Record<string, unknown>).full = install.accessToken;
      (refreshPreview as Record<string, unknown>).full = install.refreshToken;
    }
    response.kvLookup = {
      locationIdRequested: `${locationIdParam.slice(0, 8)}..${locationIdParam.slice(-4)}`,
      kvKey: `ghl:install:${locationIdParam}`,
      found: !!install,
      hasAccessToken: !!install?.accessToken,
      hasRefreshToken: !!install?.refreshToken,
      userType: install?.userType ?? null,
      accessToken: accessPreview,
      refreshToken: refreshPreview,
    };
  }

  if (showToken && isDev) {
    response._warning = 'Full tokens shown only in NODE_ENV=development. Never use showToken=1 in production.';
  } else if (showToken && !isDev) {
    response._warning = 'Full token only returned when NODE_ENV=development. You are in production; only preview (length + first/last chars) is shown.';
  }

  return NextResponse.json(response, { status: 200 });
}
