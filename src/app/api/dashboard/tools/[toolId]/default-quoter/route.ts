import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndToolWithClient } from '@/lib/dashboard-auth';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/dashboard/tools/[toolId]/default-quoter
 * Set this tool as the organization's default quoter (opened when "New Quote" is clicked on the Quotes page).
 * Body: { set: true } to set as default. Unsets any other tool in the org.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndToolWithClient(toolId);
  if (auth instanceof NextResponse) return auth;
  const { tool } = auth;
  const orgId = tool.org_id;
  if (!orgId) {
    return NextResponse.json({ error: 'Tool has no organization' }, { status: 400 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const set = body.set === true;
    const supabase = createSupabaseServer();
    const orgTable = supabase.from('organizations');
    const { error } = await orgTable
      // @ts-expect-error - Supabase infers Update as never; Database.organizations.Update is correct
      .update({ default_quoter_tool_id: set ? toolId : null })
      .eq('id', orgId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, isDefaultQuoter: set });
  } catch (err) {
    console.error('PATCH /api/dashboard/tools/[toolId]/default-quoter:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
