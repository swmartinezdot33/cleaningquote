import { notFound } from 'next/navigation';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { Home } from '@/app/quote-flow/QuoteFlowPage';
import { getToolConfigByToolId } from '@/lib/tools/config';

export const dynamic = 'force-dynamic';

/**
 * Org-scoped tool URL: /t/[orgSlug]/[toolSlug]
 * Resolves tool unambiguously by org + tool slug so quotes always go to the right org.
 */
export default async function OrgScopedToolPage({
  params,
}: {
  params: Promise<{ orgSlug: string; toolSlug: string }>;
}) {
  const { orgSlug, toolSlug } = await params;
  if (!orgSlug || !toolSlug) notFound();

  const supabase = await createSupabaseServerSSR();
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .single();
  if (!org) notFound();

  const { data: tool } = await supabase
    .from('tools')
    .select('id, slug')
    .eq('org_id', (org as { id: string }).id)
    .eq('slug', toolSlug)
    .single();
  if (!tool) notFound();

  const toolId = (tool as { id: string }).id;
  const initialConfig = await getToolConfigByToolId(toolId);
  const pathBase = `/t/${orgSlug}/${toolSlug}`;

  return (
    <Home
      slug={toolSlug}
      toolId={toolId}
      initialConfig={initialConfig}
      pathBase={pathBase}
    />
  );
}
