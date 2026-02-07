import { getGHLConfig } from '@/lib/kv';

/**
 * If the tool has webhook enabled and a URL configured, POST the event payload to that URL.
 * Fire-and-forget; never throws. Use for out-of-band notifications (Zapier, other CRMs).
 */
export async function fireWebhook(
  toolId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const config = await getGHLConfig(toolId);
    if (!config?.webhookEnabled || !config.webhookUrl?.trim()) return;
    const url = config.webhookUrl.trim();
    const body = JSON.stringify({
      event,
      toolId,
      timestamp: new Date().toISOString(),
      ...payload,
    });
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {});
  } catch {
    // Do not fail the main flow
  }
}
