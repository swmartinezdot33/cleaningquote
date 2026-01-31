import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { isSuperAdminEmail } from '@/lib/org-auth';
import { Resend } from 'resend';
import { getInboxMeta } from '@/lib/kv';

export const dynamic = 'force-dynamic';

/** GET - List received emails from Resend, merged with inbox meta (flagged, deleted). Super admin only. */
export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const after = searchParams.get('after') ?? undefined;
  const before = searchParams.get('before') ?? undefined;
  const filter = searchParams.get('filter') ?? 'inbox'; // inbox | flagged | trash | sent

  try {
    const resend = new Resend(apiKey);

    if (filter === 'sent') {
      const listOptions = after ? { limit, after } : before ? { limit, before } : { limit };
      const { data: listData, error } = await resend.emails.list(listOptions);

      if (error || !listData?.data) {
        return NextResponse.json(
          { error: (error as { message?: string })?.message ?? 'Failed to list sent emails' },
          { status: 500 }
        );
      }

      const emails = listData.data.map((e: { id: string; from: string; to: string[]; subject: string | null; created_at: string; last_event?: string }) => ({
        id: e.id,
        from: e.from ?? '',
        to: Array.isArray(e.to) ? e.to : [e.to].filter(Boolean),
        subject: e.subject ?? '(no subject)',
        created_at: e.created_at,
        direction: 'sent' as const,
        last_event: e.last_event,
      }));

      return NextResponse.json({
        data: emails,
        has_more: listData.has_more ?? false,
      });
    }

    const listOptions = after ? { limit, after } : before ? { limit, before } : { limit };
    const { data: listData, error } = await resend.emails.receiving.list(listOptions);

    if (error || !listData?.data) {
      return NextResponse.json(
        { error: (error as { message?: string })?.message ?? 'Failed to list received emails' },
        { status: 500 }
      );
    }

    const emails = listData.data;
    const metaList = await Promise.all(emails.map((e: { id: string }) => getInboxMeta(e.id)));
    const merged = emails.map((email: Record<string, unknown>, i: number) => ({
      ...email,
      direction: 'received' as const,
      flagged: metaList[i]?.flagged ?? false,
      deleted: metaList[i]?.deleted ?? false,
    }));

    let filtered = merged;
    if (filter === 'flagged') filtered = merged.filter((e: { flagged?: boolean }) => e.flagged);
    if (filter === 'trash') filtered = merged.filter((e: { deleted?: boolean }) => e.deleted);
    if (filter === 'inbox') filtered = merged.filter((e: { deleted?: boolean }) => !e.deleted);

    return NextResponse.json({
      data: filtered,
      has_more: listData.has_more ?? false,
    });
  } catch (err) {
    console.error('Super admin inbox list:', err);
    return NextResponse.json({ error: 'Failed to list inbox' }, { status: 500 });
  }
}
