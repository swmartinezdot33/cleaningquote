import { NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canAccessTool } from '@/lib/org-auth';
import type { Tool } from '@/lib/supabase/types';
export type DashboardAuthResult = { user: { id: string; email?: string }; tool: Tool };

export type DashboardAuthResultWithClient = DashboardAuthResult & {
  supabase: Awaited<ReturnType<typeof createSupabaseServerSSR>>;
};

/**
 * Get the current Supabase user and verify they can access the given tool
 * (org member or super admin).
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
 * Same as getDashboardUserAndTool but returns the Supabase client.
 */
export async function getDashboardUserAndToolWithClient(
  toolId: string
): Promise<DashboardAuthResultWithClient | NextResponse> {
  if (!toolId) {
    return NextResponse.json({ error: 'Tool ID required' }, { status: 400 });
  }

  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

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
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Not found', message: 'Tool not found or access denied.' },
      { status: 404 }
    );
  }

  const tool = data as Tool;
  const allowed = await canAccessTool(user.id, user.email ?? undefined, tool.org_id);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Not found', message: 'Tool not found or access denied.' },
      { status: 404 }
    );
  }

  return {
    user: { id: user.id, email: user.email },
    tool,
    supabase,
  };
}
