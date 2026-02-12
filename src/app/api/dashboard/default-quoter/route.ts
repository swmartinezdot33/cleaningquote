import { NextRequest, NextResponse } from 'next/server';
import { getDashboardLocationAndOrg } from '@/lib/dashboard-location';
import { createSupabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dashboard/default-quoter
 * Returns the tool designated as default quoter for the current org (from locationId).
 * Used by the Quotes page "New Quote" button to open the quote form in a modal.
 */
export async function GET(request: NextRequest) {
  const resolved = await getDashboardLocationAndOrg(request);
  if (resolved instanceof NextResponse) return resolved;
  const { orgId } = resolved;
  if (!orgId) {
    return NextResponse.json({ defaultQuoter: null });
  }
  const supabase = createSupabaseServer();
  const { data: orgRow, error: orgErr } = await supabase
    .from('organizations')
    .select('id, slug, default_quoter_tool_id')
    .eq('id', orgId)
    .single();
  if (orgErr || !orgRow) {
    return NextResponse.json({ defaultQuoter: null });
  }
  const defaultToolId = (orgRow as { default_quoter_tool_id: string | null }).default_quoter_tool_id;
  if (!defaultToolId) {
    return NextResponse.json({ defaultQuoter: null });
  }
  const { data: toolRow, error: toolErr } = await supabase
    .from('tools')
    .select('id, name, slug')
    .eq('id', defaultToolId)
    .eq('org_id', orgId)
    .single();
  if (toolErr || !toolRow) {
    return NextResponse.json({ defaultQuoter: null });
  }
  const orgSlug = (orgRow as { slug: string }).slug;
  const toolSlug = (toolRow as { slug: string }).slug;
  const newQuotePath = orgSlug && toolSlug ? `/t/${orgSlug}/${toolSlug}` : `/t/${toolSlug}`;
  return NextResponse.json({
    defaultQuoter: {
      toolId: (toolRow as { id: string }).id,
      toolName: (toolRow as { name: string }).name,
      toolSlug,
      orgSlug: orgSlug || null,
      newQuotePath,
    },
  });
}
