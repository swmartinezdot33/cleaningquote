import { NextRequest, NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';
import type { GHLIframeData } from '@/lib/ghl-iframe-types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ghl/iframe-context/decrypt
 * Decrypt GHL encrypted user data using GHL_APP_SSO_KEY (Shared Secret). See GHL_IFRAME_APP_AUTH.md.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let encryptedData = body.encryptedData ?? body.key;

    console.log('[CQ Decrypt] request', { type: typeof encryptedData, isArray: Array.isArray(encryptedData), hasValue: !!encryptedData });

    if (!encryptedData) {
      return NextResponse.json(
        { error: 'Encrypted data is required (encryptedData or key)' },
        { status: 400 }
      );
    }

    if (Array.isArray(encryptedData)) {
      encryptedData = encryptedData[0];
    }

    const ssoKey = process.env.GHL_APP_SSO_KEY?.trim();
    console.log('[CQ Decrypt] GHL_APP_SSO_KEY', { set: !!ssoKey });

    if (!ssoKey) {
      return NextResponse.json(
        {
          error: 'GHL_APP_SSO_KEY is not configured.',
          hint: 'Get Shared Secret from GHL Marketplace App → Advanced Settings → Auth → Shared Secret. Add to Vercel env and redeploy.',
        },
        { status: 400 }
      );
    }

    let userData: Record<string, unknown>;

    if (typeof encryptedData === 'string' && CryptoJS) {
      try {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, ssoKey).toString(CryptoJS.enc.Utf8);

        if (!decrypted || decrypted.trim() === '') {
          try {
            userData = JSON.parse(encryptedData) as Record<string, unknown>;
          } catch {
            return NextResponse.json(
              {
                error: 'Decryption failed. GHL_APP_SSO_KEY (Shared Secret) does not match your Marketplace App.',
                hint: 'Copy the exact Shared Secret from Marketplace App → Advanced Settings → Auth → Shared Secret. Regenerate if unsure.',
              },
              { status: 400 }
            );
          }
        } else {
          userData = JSON.parse(decrypted) as Record<string, unknown>;
          console.log('[CQ Decrypt] success', { locationId: (userData as any)?.activeLocation ?? (userData as any)?.locationId });
        }
      } catch (decryptError) {
        console.warn('[Decrypt] Decrypt error:', decryptError);
        try {
          userData = JSON.parse(encryptedData) as Record<string, unknown>;
        } catch {
          return NextResponse.json(
            {
              error: 'Failed to decrypt or parse user data.',
              hint: 'Ensure GHL_APP_SSO_KEY matches your Marketplace App Shared Secret exactly.',
            },
            { status: 400 }
          );
        }
      }
    } else if (typeof encryptedData === 'string') {
      try {
        userData = JSON.parse(encryptedData) as Record<string, unknown>;
      } catch {
        return NextResponse.json(
          { error: 'Data appears encrypted but decryption failed. Check GHL_APP_SSO_KEY.' },
          { status: 400 }
        );
      }
    } else if (typeof encryptedData === 'object') {
      userData = encryptedData as Record<string, unknown>;
    } else {
      return NextResponse.json({ error: 'Invalid encrypted data format' }, { status: 400 });
    }

    const contextType = userData.type as string | undefined;
    const activeLocation = userData.activeLocation as string | undefined;

    if (contextType === 'agency' && !activeLocation) {
      console.warn('[Decrypt] Agency-only context rejected. Open from a location (sub-account).');
      return NextResponse.json(
        {
          error: 'This app must be opened from a sub-account (location), not Agency view.',
          hint: 'In GoHighLevel, open CleanQuote from a specific location dashboard so we receive location context (activeLocation).',
        },
        { status: 400 }
      );
    }

    const locationId =
      activeLocation ??
      (userData.locationId as string) ??
      (userData.location_id as string) ??
      (userData.location as { id?: string })?.id ??
      (userData.location as { locationId?: string })?.locationId ??
      (userData.context as { locationId?: string })?.locationId;

    if (!locationId) {
      console.warn('[Decrypt] No locationId in decrypted data. Keys:', Object.keys(userData ?? {}));
      return NextResponse.json(
        {
          error: 'Location ID not found. Open from a sub-account dashboard (not Agency view).',
          hint: 'Location context provides activeLocation. Agency context only has companyId.',
        },
        { status: 400 }
      );
    }
    console.log('[CQ Decrypt] returning context', { locationId: locationId?.slice(0, 12) + '...' });

    // GHL Location context uses activeLocation, userName, email per docs
    const ghlContext: GHLIframeData = {
      locationId,
      userId: (userData.userId ?? userData.user_id ?? (userData.user as { id?: string })?.id) as string | undefined,
      companyId: (userData.companyId ?? userData.company_id) as string | undefined,
      locationName: (userData.locationName ?? userData.location_name ?? (userData.location as { name?: string })?.name) as string | undefined,
      userName: (userData.userName ?? userData.user_name ?? (userData.user as { name?: string })?.name) as string | undefined,
      userEmail: (userData.userEmail ?? userData.user_email ?? userData.email ?? (userData.user as { email?: string })?.email) as string | undefined,
    };

    return NextResponse.json({
      success: true,
      ...ghlContext,
      message: 'User data decrypted successfully',
    });
  } catch (error) {
    console.error('[CQ Decrypt] error', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to decrypt user data' },
      { status: 500 }
    );
  }
}
