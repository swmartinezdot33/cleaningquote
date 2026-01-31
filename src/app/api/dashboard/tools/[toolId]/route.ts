import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndToolWithClient } from '@/lib/dashboard-auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import { isSuperAdminEmail } from '@/lib/org-auth';
import { slugToSafe } from '@/lib/supabase/tools';

export const dynamic = 'force-dynamic';

/** DELETE - Delete tool */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndToolWithClient(toolId);
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;

  const { error } = await supabase.from('tools').delete().eq('id', toolId);

  if (error) {
    console.error('DELETE /api/dashboard/tools/[toolId]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/** PATCH - Update tool (e.g. slug) */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndToolWithClient(toolId);
  if (auth instanceof NextResponse) return auth;

  const { tool, user, supabase } = auth;

  try {
    const body = await request.json();
    const slugRaw = typeof body.slug === 'string' ? body.slug.trim() : '';
    const slug = slugToSafe(slugRaw || tool.slug);

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required and must be URL-safe' }, { status: 400 });
    }

    const updateClient = isSuperAdminEmail(user.email) ? createSupabaseServer() : supabase;

    const { data: existing } = await updateClient
      .from('tools')
      .select('id')
      .eq('slug', slug)
      .neq('id', toolId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `Slug "${slug}" is already in use` }, { status: 400 });
    }

    const { data: updated, error } = await updateClient
      .from('tools')
      // @ts-expect-error Supabase SSR client types .update() param as never; payload is valid ToolUpdate
      .update({ slug, updated_at: new Date().toISOString() })
      .eq('id', toolId)
      .select()
      .single();

    if (error) {
      console.error('PATCH /api/dashboard/tools/[toolId] update error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!updated) {
      return NextResponse.json({ error: 'Update did not return a row' }, { status: 500 });
    }
    return NextResponse.json({ tool: updated });
  } catch (err) {
    console.error('PATCH /api/dashboard/tools/[toolId]:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
