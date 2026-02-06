import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canManageOrg } from '@/lib/org-auth';

export const dynamic = 'force-dynamic';

/** GET - List org tools with their assigned pricing structure id (for assignment UI under Pricing). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await context.params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canManage = await canManageOrg(user.id, user.email ?? undefined, orgId);
  if (!canManage) {
    return NextResponse.json({ error: 'Only org admins can view tool assignments' }, { status: 403 });
  }

  const { data: tools, error: toolsError } = await supabase
    .from('tools')
    .select('id, name')
    .eq('org_id', orgId)
    .order('name');

  if (toolsError) {
    return NextResponse.json({ error: toolsError.message }, { status: 500 });
  }

  if (!tools?.length) {
    return NextResponse.json({ tools: [] });
  }

  const toolIds = tools.map((t: { id: string }) => t.id);
  const { data: configs, error: configError } = await supabase
    .from('tool_config')
    .select('tool_id, pricing_structure_id')
    .in('tool_id', toolIds);

  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 });
  }

  const byTool = (configs ?? []).reduce(
    (acc: Record<string, string | null>, row: { tool_id: string; pricing_structure_id: string | null }) => {
      acc[row.tool_id] = row.pricing_structure_id ?? null;
      return acc;
    },
    {}
  );

  const result = (tools ?? []).map((t: { id: string; name: string }) => ({
    id: t.id,
    name: t.name,
    pricingStructureId: byTool[t.id] ?? null,
  }));

  return NextResponse.json({ tools: result });
}
