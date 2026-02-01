import { notFound } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server';
import { Home } from '@/app/quote-flow/QuoteFlowPage';
import { getToolConfigByToolId } from '@/lib/tools/config';
import type { Tool } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

/**
 * Single-slug tool URL: /t/[slug]. Public page: use service-role client so tool resolution works for unauthenticated users.
 */
export default async function ToolSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug) notFound();
  const supabase = createSupabaseServer();
  const { data: tools } = await supabase.from('tools').select('id').eq('slug', slug);
  const list = (tools ?? []) as { id: string }[];
  if (list.length > 1) {
    notFound();
  }
  const tool = list[0] as Tool | undefined;
  if (!tool) notFound();
  const initialConfig = await getToolConfigByToolId(tool.id);
  return <Home slug={slug} toolId={tool.id} initialConfig={initialConfig ?? undefined} />;
}
