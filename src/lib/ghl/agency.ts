/**
 * GHL Agency-level API operations.
 * Requires GHL_AGENCY_ACCESS_TOKEN and GHL_COMPANY_ID (your agency).
 * Used to create sub-accounts when customers purchase via Stripe,
 * and to get location tokens for auto-installed apps.
 */

import { storeInstallation } from './token-store';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

export interface CreateSubAccountInput {
  name: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  stripeCustomerId?: string;
}

export interface CreateSubAccountResult {
  success: boolean;
  locationId?: string;
  error?: string;
}

/**
 * Create a GHL sub-account (location) under the agency.
 * Requires Agency Pro plan. Uses GHL_AGENCY_ACCESS_TOKEN and GHL_COMPANY_ID.
 */
export async function createGHLSubAccount(input: CreateSubAccountInput): Promise<CreateSubAccountResult> {
  const token = process.env.GHL_AGENCY_ACCESS_TOKEN?.trim();
  const companyId = process.env.GHL_COMPANY_ID?.trim();

  if (!token || !companyId) {
    return { success: false, error: 'GHL_AGENCY_ACCESS_TOKEN and GHL_COMPANY_ID must be set' };
  }

  try {
    const body: Record<string, unknown> = {
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      companyId,
    };
    if (input.phone?.trim()) body.phone = input.phone.trim();
    if (input.firstName?.trim()) body.firstName = input.firstName.trim();
    if (input.lastName?.trim()) body.lastName = input.lastName.trim();

    const res = await fetch(`${GHL_API_BASE}/locations/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Version': '2021-07-28',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error('GHL create location failed:', res.status, data);
      return {
        success: false,
        error: (data as { message?: string }).message ?? (data as { error?: string }).error ?? `GHL API ${res.status}`,
      };
    }

    const locationId = (data as { location?: { id?: string } }).location?.id
      ?? (data as { id?: string }).id;

    if (!locationId) {
      console.error('GHL create location: no locationId in response', data);
      return { success: false, error: 'No location ID in GHL response' };
    }

    return { success: true, locationId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GHL create location error:', err);
    return { success: false, error: msg };
  }
}

export interface LocationTokenResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * Get a Location-level access token from the Agency token.
 * Used when the app is auto-installed: we have locationId (from iframe or webhook)
 * and can exchange our Agency token for a Location token to make API calls.
 */
export async function getLocationTokenFromAgency(
  locationId: string,
  companyId: string
): Promise<LocationTokenResult> {
  const token = process.env.GHL_AGENCY_ACCESS_TOKEN?.trim();
  if (!token) {
    return { success: false, error: 'GHL_AGENCY_ACCESS_TOKEN not set' };
  }

  try {
    const body = new URLSearchParams({
      companyId,
      locationId,
    });

    const res = await fetch(`${GHL_API_BASE}/oauth/locationToken`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Version: '2021-07-28',
      },
      body: body.toString(),
    });

    const data = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      locationId?: string;
      companyId?: string;
      userId?: string;
      error?: string;
      message?: string;
    };

    if (!res.ok) {
      console.error('GHL locationToken failed:', res.status, data);
      return {
        success: false,
        error: data.error ?? data.message ?? `GHL API ${res.status}`,
      };
    }

    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    if (!accessToken || !refreshToken) {
      return { success: false, error: 'No access_token or refresh_token in response' };
    }

    const expiresAt = Date.now() + (data.expires_in ?? 86400) * 1000;

    await storeInstallation({
      accessToken,
      refreshToken,
      expiresAt,
      companyId: data.companyId ?? companyId,
      userId: data.userId ?? '',
      locationId: data.locationId ?? locationId,
    });

    return {
      success: true,
      accessToken,
      refreshToken,
      expiresAt,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('GHL getLocationTokenFromAgency error:', err);
    return { success: false, error: msg };
  }
}
