import { kv } from '@vercel/kv';

const PRICING_KEY = 'pricing:file:2026';

/**
 * Get the KV client (lazy initialization)
 */
export function getKV() {
  // KV client is auto-initialized from environment variables
  // Vercel automatically injects: KV_REST_API_URL, KV_REST_API_TOKEN, KV_REST_API_READ_ONLY_TOKEN
  return kv;
}

/**
 * Store pricing file buffer in KV storage
 */
export async function storePricingFile(buffer: Buffer): Promise<void> {
  const kv = getKV();
  
  // Convert buffer to base64 string for storage
  const base64Data = buffer.toString('base64');
  
  await kv.set(PRICING_KEY, base64Data);
  await kv.set(`${PRICING_KEY}:metadata`, {
    uploadedAt: new Date().toISOString(),
    size: buffer.length,
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Get pricing file buffer from KV storage
 */
export async function getPricingFile(): Promise<Buffer> {
  const kv = getKV();
  
  const base64Data = await kv.get<string>(PRICING_KEY);
  
  if (!base64Data) {
    throw new Error(
      `Pricing file not found in KV storage. Please upload a pricing file using the /api/admin/upload-pricing endpoint.`
    );
  }
  
  return Buffer.from(base64Data, 'base64');
}

/**
 * Get pricing file metadata
 */
export async function getPricingFileMetadata() {
  const kv = getKV();
  return await kv.get(`${PRICING_KEY}:metadata`);
}

/**
 * Check if pricing file exists
 */
export async function pricingFileExists(): Promise<boolean> {
  try {
    const kv = getKV();
    const exists = await kv.exists(PRICING_KEY);
    return exists === 1;
  } catch {
    return false;
  }
}
