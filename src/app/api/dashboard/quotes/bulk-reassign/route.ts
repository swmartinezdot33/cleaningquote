import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dashboard/quotes/bulk-reassign
 * Body: { ids: string[], tool_id: string | null } — Supabase quote row ids and target tool.
 * Super admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const rawIds = Array.isArray(body.ids) ? body.ids : [];
    const ids = rawIds.filter((id: unknown) => typeof id === 'string' && (id as string).trim()).map((id: string) => (id as string).trim());
    const toolId = body.tool_id === undefined || body.tool_id === null
      ? null
      : (typeof body.tool_id === 'string' ? body.tool_id.trim() || null : null);

    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids array required (non-empty)' }, { status: 400 });
    }

    const admin = createSupabaseServer();
    const { error } = await (admin.from('quotes') as any)
      .update({ tool_id: toolId })
      .in('id', ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, updated: ids.length, tool_id: toolId });
  } catch (err) {
    console.error('Bulk reassign quotes error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to bulk reassign' },
      { status: 500 }
    );
  }
}
