import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/dashboard/quotes/[id]
 * Delete a quote from the quotes table.
 * Allowed: super admin (any quote), org admin (quotes for tools in their org).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: quoteRowId } = await params;
    if (!quoteRowId) {
      return NextResponse.json({ error: 'Quote ID required' }, { status: 400 });
    }

    const isSuperAdmin = isSuperAdminEmail(user.email ?? undefined);
    const admin = createSupabaseServer();

    const { data: quoteRow, error: quoteErr } = await admin
      .from('quotes')
      .select('id, tool_id')
      .eq('id', quoteRowId)
      .single();

    if (quoteErr || !quoteRow) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const quote = quoteRow as { id: string; tool_id: string | null };

    if (!isSuperAdmin) {
      if (!quote.tool_id) {
        return NextResponse.json(
          { error: 'Only super admins can delete quotes not assigned to a tool' },
          { status: 403 }
        );
      }
      const { data: toolRow } = await admin
        .from('tools')
        .select('org_id')
        .eq('id', quote.tool_id)
        .single();
      const tool = toolRow as { org_id: string } | null;
      if (!tool?.org_id) {
        return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
      }
      const { data: memberRow } = await admin
        .from('organization_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('org_id', tool.org_id)
        .maybeSingle();
      const member = memberRow as { role: string } | null;
      if (!member || member.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only org admins can delete quotes for this tool' },
          { status: 403 }
        );
      }
    }

    const { error: deleteErr } = await admin
      .from('quotes')
      .delete()
      .eq('id', quoteRowId);

    if (deleteErr) {
      return NextResponse.json(
        { error: deleteErr.message ?? 'Failed to delete quote' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Delete quote error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete quote' },
      { status: 500 }
    );
  }
}
