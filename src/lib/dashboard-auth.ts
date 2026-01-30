import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import type { Tool } from '@/lib/supabase/types';
export type DashboardAuthResult = { user: { id: string; email?: string }; tool: Tool };

export type DashboardAuthResultWithClient = DashboardAuthResult & {
  supabase: Awaited<ReturnType<typeof createSupabaseServerSSR>>;
};

/**
 * Get the current Supabase user and verify they own the given tool.
 * Use in dashboard API routes under /api/dashboard/tools/[toolId]/.
 * Returns { user, tool } on success, or a NextResponse error to return.
 */
export async function getDashboardUserAndTool(
  toolId: string
): Promise<DashboardAuthResult | NextResponse> {
  const result = await getDashboardUserAndToolWithClient(toolId);
  if (result instanceof NextResponse) return result;
  const { supabase: _s, ...rest } = result;
  return rest;
}

/**
 * Same as getDashboardUserAndTool but returns the Supabase client so the caller
 * can run further queries with the same session (e.g. updates).
 */
export async function getDashboardUserAndToolWithClient(
  toolId: string
): Promise<DashboardAuthResultWithClient | NextResponse> {
  if (!toolId) {
    return NextResponse.json({ error: 'Tool ID required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Please sign in.' },
      { status: 401 }
    );
  }

  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('id', toolId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Not found', message: 'Tool not found or access denied.' },
      { status: 404 }
    );
  }

  return {
    user: { id: user.id, email: user.email },
    tool: data as Tool,
    supabase,
  };
}
