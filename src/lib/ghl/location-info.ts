/**
 * Fetch location/company name from GHL for display (e.g. after OAuth install).
 */

const API_BASE = 'https://services.leadconnectorhq.com';

/**
 * Get location name (or company name) from GHL for a given locationId.
 * Used when storing OAuth installation so we have locationId, org name, and token.
 */
export async function fetchLocationName(
  accessToken: string,
  locationId: string
): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/locations/${locationId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Version: '2021-04-15',
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const loc = (data.location ?? data) as Record<string, unknown> | undefined;
    if (!loc || typeof loc !== 'object') return null;
    const name =
      typeof loc.name === 'string'
        ? loc.name
        : typeof loc.companyName === 'string'
          ? loc.companyName
          : typeof (loc as { company?: { name?: string } }).company?.name === 'string'
            ? (loc as { company: { name: string } }).company.name
            : null;
    return name || null;
  } catch {
    return null;
  }
}
