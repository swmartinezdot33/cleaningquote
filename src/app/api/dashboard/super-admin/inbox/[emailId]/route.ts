import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { isSuperAdminEmail } from '@/lib/org-auth';
import { Resend } from 'resend';
import { getInboxMeta, setInboxMeta } from '@/lib/kv';

export const dynamic = 'force-dynamic';

/** GET - Retrieve one received email (full body). Super admin only. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });
  }

  const { emailId } = await params;
  if (!emailId) {
    return NextResponse.json({ error: 'Missing emailId' }, { status: 400 });
  }

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.receiving.get(emailId);
    if (error || !data) {
      return NextResponse.json(
        { error: (error as { message?: string })?.message ?? 'Email not found' },
        { status: 404 }
      );
    }
    const meta = await getInboxMeta(emailId);
    return NextResponse.json({
      ...data,
      flagged: meta?.flagged ?? false,
      deleted: meta?.deleted ?? false,
    });
  } catch (err) {
    console.error('Super admin inbox get:', err);
    return NextResponse.json({ error: 'Failed to get email' }, { status: 500 });
  }
}

/** PATCH - Update inbox meta (flagged, deleted). Super admin only. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ emailId: string }> }
) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { emailId } = await params;
  if (!emailId) {
    return NextResponse.json({ error: 'Missing emailId' }, { status: 400 });
  }

  let body: { flagged?: boolean; deleted?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const current = await getInboxMeta(emailId);
    const next = {
      flagged: body.flagged !== undefined ? body.flagged : (current?.flagged ?? false),
      deleted: body.deleted !== undefined ? body.deleted : (current?.deleted ?? false),
    };
    await setInboxMeta(emailId, next);
    return NextResponse.json(next);
  } catch (err) {
    console.error('Super admin inbox PATCH:', err);
    return NextResponse.json({ error: 'Failed to update meta' }, { status: 500 });
  }
}
