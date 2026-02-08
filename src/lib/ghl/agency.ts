/**
 * GHL Agency-level API operations.
 * Requires GHL_AGENCY_ACCESS_TOKEN and GHL_COMPANY_ID (your agency).
 * Used to create sub-accounts when customers purchase via Stripe.
 */

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
