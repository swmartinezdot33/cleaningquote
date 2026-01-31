import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { isSuperAdminEmail } from '@/lib/org-auth';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resendFrom = process.env.RESEND_FROM ?? 'CleanQuote.io <team@clean.io>';

/** POST - Send a reply to a received email (In-Reply-To threading). Super admin only. */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });
  }

  let body: { to: string; subject: string; html: string; message_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { to, subject, html, message_id } = body;
  if (!to || typeof to !== 'string' || !subject || typeof subject !== 'string') {
    return NextResponse.json({ error: 'to and subject required' }, { status: 400 });
  }
  const content = (typeof html === 'string' && html.trim()) ? html : '<p>(No content)</p>';

  try {
    const resend = new Resend(apiKey);
    const headers: Record<string, string> = {};
    if (message_id && typeof message_id === 'string') {
      headers['In-Reply-To'] = message_id;
    }
    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: to.trim(),
      subject: subject.trim(),
      html: content,
      headers: Object.keys(headers).length ? headers : undefined,
    });
    if (error) {
      return NextResponse.json(
        { error: (error as { message?: string })?.message ?? 'Send failed' },
        { status: 400 }
      );
    }
    return NextResponse.json({ id: data?.id, ok: true });
  } catch (err) {
    console.error('Super admin inbox reply:', err);
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 500 });
  }
}
