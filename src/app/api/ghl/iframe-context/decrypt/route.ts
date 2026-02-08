import { NextRequest, NextResponse } from 'next/server';
import CryptoJS from 'crypto-js';
import { createDecipheriv, createHash } from 'node:crypto';
import type { GHLIframeData } from '@/lib/ghl-iframe-types';

export const dynamic = 'force-dynamic';

/**
 * Decrypt using CryptoJS (per official GHL User Context docs):
 * https://marketplace.gohighlevel.com/docs/other/user-context-marketplace-apps
 */
function decryptWithCryptoJS(encryptedData: string, ssoKey: string): Record<string, unknown> | null {
  const decrypted = CryptoJS.AES.decrypt(encryptedData, ssoKey).toString(CryptoJS.enc.Utf8);
  if (!decrypted || decrypted.trim() === '') return null;
  return JSON.parse(decrypted) as Record<string, unknown>;
}

/**
 * Decrypt using EVP_BytesToKey (GHL marketplace app template fallback):
 * https://github.com/GoHighLevel/ghl-marketplace-app-template
 */
function decryptWithEVP(keyBase64: string, ssoKey: string): Record<string, unknown> {
  const blockSize = 16;
  const keySize = 32;
  const ivSize = 16;
  const saltSize = 8;

  const rawEncryptedData = Buffer.from(keyBase64, 'base64');
  const salt = rawEncryptedData.subarray(saltSize, blockSize);
  const cipherText = rawEncryptedData.subarray(blockSize);

  let result = Buffer.alloc(0);
  while (result.length < keySize + ivSize) {
    const hasher = createHash('md5');
    const chunk = hasher
      .update(Buffer.concat([result.subarray(-ivSize), Buffer.from(ssoKey, 'utf-8'), salt]))
      .digest();
    result = Buffer.concat([result, chunk]);
  }

  const decipher = createDecipheriv(
    'aes-256-cbc',
    result.subarray(0, keySize),
    result.subarray(keySize, keySize + ivSize)
  );
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return JSON.parse(decrypted.toString()) as Record<string, unknown>;
}

/**
 * POST /api/ghl/iframe-context/decrypt
 * Decrypt GHL encrypted user data using SSO key.
 * GHL sends encrypted user data via postMessage (REQUEST_USER_DATA_RESPONSE) that
 * must be decrypted using GHL_APP_SSO_KEY from marketplace app settings.
 * Supports both 'encryptedData' and 'key' body params (GHL template uses 'key').
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let encryptedData = body.encryptedData ?? body.key;

    if (!encryptedData) {
      return NextResponse.json(
        { error: 'Encrypted data is required (encryptedData or key)' },
        { status: 400 }
      );
    }
    if (Array.isArray(encryptedData)) {
      encryptedData = encryptedData[0];
    }

    const ssoKey = process.env.GHL_APP_SSO_KEY;
    let userData: Record<string, unknown> | null = null;

    if (ssoKey && typeof encryptedData === 'string') {
      userData = decryptWithCryptoJS(encryptedData, ssoKey);
      if (!userData) {
        try {
          userData = decryptWithEVP(encryptedData, ssoKey);
        } catch {
          // EVP format not used
        }
      }
      if (!userData) {
        try {
          userData = JSON.parse(encryptedData) as Record<string, unknown>;
        } catch {
          return NextResponse.json(
            {
              error: 'Decryption failed. Ensure GHL_APP_SSO_KEY (Shared Secret) matches Marketplace App → Advanced Settings → Auth → Shared Secret.',
              hint: 'Generate the key in your app settings if needed.',
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

    if (!userData) {
      return NextResponse.json({ error: 'Decryption failed' }, { status: 400 });
    }

    const locationId =
      (userData.activeLocation as string) ??
      (userData.locationId as string) ??
      (userData.location_id as string) ??
      (userData.location as { id?: string })?.id ??
      (userData.location as { locationId?: string })?.locationId ??
      (userData.context as { locationId?: string })?.locationId ??
      (userData.context as { activeLocation?: string })?.activeLocation;

    if (!locationId) {
      return NextResponse.json(
        {
          error: 'Location ID not found in user data',
          hint: 'Open the app from a sub-account dashboard (not Agency view). Location context provides activeLocation. Agency context only has companyId.',
          type: (userData.type as string) ?? 'unknown',
        },
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
