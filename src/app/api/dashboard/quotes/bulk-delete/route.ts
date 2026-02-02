import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dashboard/quotes/bulk-delete
 * Body: { ids: string[] } — Supabase quote row ids.
 * Allowed: super admin (any), org admin (quotes for tools in their org).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const rawIds = Array.isArray(body.ids) ? body.ids : [];
    const ids = rawIds.filter((id: unknown) => typeof id === 'string' && id.trim()).map((id: string) => id.trim());

    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids array required (non-empty)' }, { status: 400 });
    }

    const isSuperAdmin = isSuperAdminEmail(user.email ?? undefined);
    const admin = createSupabaseServer();

    const { data: rows, error: fetchErr } = await admin
      .from('quotes')
      .select('id, tool_id')
      .in('id', ids);

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    const quotes = (rows ?? []) as { id: string; tool_id: string | null }[];
    let allowedIds: string[];

    if (isSuperAdmin) {
      allowedIds = quotes.map((q) => q.id);
    } else {
      const orgIds = new Set<string>();
      const { data: members } = await admin
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .eq('role', 'admin');
      (members ?? []).forEach((m: { org_id: string }) => orgIds.add(m.org_id));

      const toolToOrg = new Map<string, string>();
      const toolIds = [...new Set(quotes.map((q) => q.tool_id).filter(Boolean))] as string[];
      if (toolIds.length > 0) {
        const { data: tools } = await admin
          .from('tools')
          .select('id, org_id')
          .in('id', toolIds);
        (tools ?? []).forEach((t: { id: string; org_id: string }) => toolToOrg.set(t.id, t.org_id));
      }

      allowedIds = quotes
        .filter((q) => {
          if (!q.tool_id) return false;
          const orgId = toolToOrg.get(q.tool_id);
          return orgId && orgIds.has(orgId);
        })
        .map((q) => q.id);
    }

    if (allowedIds.length === 0) {
      return NextResponse.json(
        { error: 'No quotes in the selection can be deleted by you', deleted: 0 },
        { status: 403 }
      );
    }

    const { error: deleteErr } = await admin
      .from('quotes')
      .delete()
      .in('id', allowedIds);

    if (deleteErr) {
      return NextResponse.json({ error: deleteErr.message, deleted: 0 }, { status: 500 });
    }

    return NextResponse.json({ ok: true, deleted: allowedIds.length });
  } catch (err) {
    console.error('Bulk delete quotes error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to bulk delete' },
      { status: 500 }
    );
  }
}
