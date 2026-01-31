import { notFound } from 'next/navigation';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { Home } from '@/app/quote-flow/QuoteFlowPage';
import { getToolConfigForPage } from '@/lib/tools/config';
import type { Tool } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

export default async function ToolSurveyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!slug) notFound();
  const supabase = await createSupabaseServerSSR();
  const { data: tools } = await supabase.from('tools').select('id').eq('slug', slug);
  const list = (tools ?? []) as { id: string }[];
  if (list.length > 1) {
    notFound();
  }
  const tool = list[0] as Tool | undefined;
  if (!tool) notFound();
  const initialConfig = await getToolConfigForPage(slug);
  return <Home slug={slug} toolId={tool.id} initialConfig={initialConfig} />;
}
