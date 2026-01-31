import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** PATCH - Reassign quote to a different tool (super admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email ?? undefined)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { quoteId } = await params;
  if (!quoteId) {
    return NextResponse.json({ error: 'Quote ID required' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const toolId = typeof body.tool_id === 'string' ? body.tool_id.trim() : null;

  if (toolId === undefined || toolId === '') {
    return NextResponse.json({ error: 'tool_id required (use null to unset)' }, { status: 400 });
  }

  const admin = createSupabaseServer();
  const { error } = await (admin.from('quotes') as any)
    .update({ tool_id: toolId || null })
    .eq('id', quoteId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tool_id: toolId || null });
}
