import { NextRequest, NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';
import type { GHLIframeData } from '@/lib/ghl-iframe-types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/ghl/iframe-context/decrypt
 * Decrypt GHL encrypted user data using SSO key.
 * GHL sends encrypted user data via postMessage (REQUEST_USER_DATA_RESPONSE) that
 * must be decrypted using GHL_APP_SSO_KEY from marketplace app settings.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { encryptedData } = body;

    if (!encryptedData) {
      return NextResponse.json(
        { error: 'Encrypted data is required' },
        { status: 400 }
      );
    }

    const ssoKey = process.env.GHL_APP_SSO_KEY;
    let userData: Record<string, unknown>;

    if (ssoKey && typeof encryptedData === 'string' && CryptoJS) {
      try {
        const decrypted = CryptoJS.AES.decrypt(encryptedData, ssoKey).toString(CryptoJS.enc.Utf8);
        if (!decrypted || decrypted.trim() === '') {
          try {
            userData = JSON.parse(encryptedData) as Record<string, unknown>;
          } catch {
            return NextResponse.json(
              {
                error: 'Decryption failed. Ensure GHL_APP_SSO_KEY matches your marketplace app SSO key.',
                hint: 'Get SSO key from: Marketplace App → Settings → SSO Key',
              },
              { status: 400 }
            );
          }
        } else {
          userData = JSON.parse(decrypted) as Record<string, unknown>;
        }
      } catch {
        try {
          userData = JSON.parse(encryptedData) as Record<string, unknown>;
        } catch {
          return NextResponse.json(
            {
              error: 'Failed to decrypt or parse user data.',
              hint: 'Set GHL_APP_SSO_KEY in environment variables.',
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
          {
            error: 'Data appears encrypted but GHL_APP_SSO_KEY is not set.',
            hint: 'Get SSO key from GoHighLevel marketplace app settings.',
          },
          { status: 400 }
        );
      }
    } else if (typeof encryptedData === 'object') {
      userData = encryptedData as Record<string, unknown>;
    } else {
      return NextResponse.json({ error: 'Invalid encrypted data format' }, { status: 400 });
    }

    const locationId =
      (userData.activeLocation as string) ??
      (userData.locationId as string) ??
      (userData.location_id as string) ??
      (userData.location as { id?: string })?.id ??
      (userData.location as { locationId?: string })?.locationId ??
      (userData.context as { locationId?: string })?.locationId;

    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID not found in user data' },
        { status: 400 }
      );
    }

    const ghlContext: GHLIframeData = {
      locationId,
      userId: (userData.userId ?? userData.user_id ?? (userData.user as { id?: string })?.id) as string | undefined,
      companyId: (userData.companyId ?? userData.company_id) as string | undefined,
      locationName: (userData.locationName ?? userData.location_name ?? (userData.location as { name?: string })?.name) as string | undefined,
      userName: (userData.userName ?? userData.user_name ?? (userData.user as { name?: string })?.name) as string | undefined,
      userEmail: (userData.userEmail ?? userData.user_email ?? (userData.user as { email?: string })?.email) as string | undefined,
      ...userData,
    };

    return NextResponse.json({
      success: true,
      ...ghlContext,
      message: 'User data decrypted successfully',
    });
  } catch (error) {
    console.error('Error decrypting GHL user data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to decrypt user data' },
      { status: 500 }
    );
  }
}
