/**
 * GHL install sessions in KV: state uuid → location_id, company_id.
 * Used so callback can resolve locationId by state first, then cookie fallback.
 * Key: ghl:install_session:{state}, TTL 600s.
 */

import { getKV } from '@/lib/kv';

const INSTALL_SESSION_PREFIX = 'ghl:install_session:';
const INSTALL_SESSION_TTL_SECONDS = 600; // 10 min

export interface InstallSessionPayload {
  location_id: string;
  company_id: string | null;
}

function sessionKey(state: string): string {
  return `${INSTALL_SESSION_PREFIX}${String(state).trim()}`;
}

/**
 * Store install session for OAuth callback. Call before redirecting to GHL.
 */
export async function setInstallSession(
  state: string,
  locationId: string,
  companyId: string | null
): Promise<void> {
  const kv = getKV();
  const key = sessionKey(state);
  const value: InstallSessionPayload = {
    location_id: locationId.trim(),
    company_id: companyId?.trim() ?? null,
  };
  await kv.set(key, value, { ex: INSTALL_SESSION_TTL_SECONDS });
}

/**
 * Look up install session by state and remove it (one-time use). Returns null if missing or expired.
 */
export async function getAndConsumeInstallSession(state: string): Promise<InstallSessionPayload | null> {
  const key = sessionKey(state);
  const kv = getKV();
  const value = await kv.get<InstallSessionPayload>(key);
  if (value?.location_id) {
    await kv.del(key);
    return value;
  }
  return null;
}
