import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import type { EmailReceivedEvent } from 'resend';

export const dynamic = 'force-dynamic';

const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

/**
 * Resend inbound email webhook (email.received).
 *
 * Setup:
 * 1. Resend Dashboard → Emails → Receiving: get your .resend.app address or add a custom domain + MX records.
 * 2. Resend Dashboard → Webhooks → Add Webhook: URL = https://your-domain.com/api/webhooks/resend, Event = email.received.
 * 3. Copy the signing secret into RESEND_WEBHOOK_SECRET (optional but recommended).
 *
 * The payload includes email_id, from, to, subject, attachments (metadata only).
 * To get body/html/text, call Resend Receiving API: resend.emails.receiving.get(email_id).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!rawBody?.trim()) {
    return NextResponse.json({ error: 'Missing body' }, { status: 400 });
  }

  let payload: { type: string; created_at?: string; data?: unknown };
  if (webhookSecret?.trim()) {
    const id = request.headers.get('svix-id');
    const timestamp = request.headers.get('svix-timestamp');
    const signature = request.headers.get('svix-signature');
    if (!id || !timestamp || !signature) {
      return NextResponse.json(
        { error: 'Missing svix headers (svix-id, svix-timestamp, svix-signature)' },
        { status: 400 }
      );
    }
    try {
      const resend = new Resend();
      payload = resend.webhooks.verify({
        payload: rawBody,
        headers: { id, timestamp, signature },
        webhookSecret: webhookSecret.trim(),
      }) as { type: string; created_at?: string; data?: unknown };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid webhook signature';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else {
    try {
      payload = JSON.parse(rawBody) as { type: string; created_at?: string; data?: unknown };
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
  }

  if (payload.type !== 'email.received') {
    return NextResponse.json({ received: true, type: payload.type });
  }

  const data = payload.data as EmailReceivedEvent['data'];
  const emailId = data?.email_id;
  const from = data?.from;
  const to = data?.to ?? [];
  const subject = data?.subject ?? '';

  let bodyFetched = false;
  let textPreview: string | undefined;
  let fullEmail: Awaited<ReturnType<Resend['emails']['receiving']['get']>>['data'] = null;

  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (resendApiKey && emailId) {
    try {
      const resend = new Resend(resendApiKey);
      const { data: received, error } = await resend.emails.receiving.get(emailId);
      if (!error && received) {
        fullEmail = received;
        bodyFetched = true;
        const text = received.text ?? (received.html ? stripHtml(received.html).slice(0, 200) : null);
        textPreview = text ? (text.length > 200 ? `${text.slice(0, 200)}…` : text) : undefined;
        console.info('[Resend inbound]', {
          emailId,
          from,
          to,
          subject,
          hasHtml: !!received.html,
          hasText: !!received.text,
          attachmentCount: received.attachments?.length ?? 0,
        });
        // Add your logic here: e.g. store fullEmail in DB, create support ticket, forward.
        // fullEmail.html, fullEmail.text, fullEmail.headers, fullEmail.attachments, fullEmail.raw
      } else {
        console.warn('[Resend inbound] failed to fetch body', { emailId, error });
      }
    } catch (err) {
      console.error('[Resend inbound] fetch body error', { emailId, err });
    }
  } else {
    console.info('[Resend inbound]', { emailId, from, to, subject });
  }

  return NextResponse.json({
    received: true,
    type: 'email.received',
    email_id: emailId,
    body_fetched: bodyFetched,
    ...(textPreview !== undefined && { text_preview: textPreview }),
  });
}

/** Strip HTML tags for a short plain-text preview. */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
