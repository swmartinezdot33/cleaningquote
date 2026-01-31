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
  const filter = searchParams.get('filter') ?? 'inbox'; // inbox | flagged | trash

  try {
    const resend = new Resend(apiKey);
    const { data: listData, error } = await resend.emails.receiving.list({
      limit,
      ...(after && { after }),
      ...(before && { before }),
    });

    if (error || !listData?.data) {
      return NextResponse.json(
        { error: (error as { message?: string })?.message ?? 'Failed to list received emails' },
        { status: 500 }
      );
    }

    const emails = listData.data;
    const metaList = await Promise.all(emails.map((e) => getInboxMeta(e.id)));
    const merged = emails.map((email, i) => ({
      ...email,
      flagged: metaList[i]?.flagged ?? false,
      deleted: metaList[i]?.deleted ?? false,
    }));

    // Client-side filter: return all and let UI filter by inbox/flagged/trash, or filter here
    let filtered = merged;
    if (filter === 'flagged') filtered = merged.filter((e) => e.flagged);
    if (filter === 'trash') filtered = merged.filter((e) => e.deleted);
    if (filter === 'inbox') filtered = merged.filter((e) => !e.deleted);

    return NextResponse.json({
      data: filtered,
      has_more: listData.has_more ?? false,
    });
  } catch (err) {
    console.error('Super admin inbox list:', err);
    return NextResponse.json({ error: 'Failed to list inbox' }, { status: 500 });
  }
}
