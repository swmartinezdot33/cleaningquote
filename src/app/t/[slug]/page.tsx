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
  const { data } = await supabase.from('tools').select('id').eq('slug', slug).single();
  const tool = data as Tool | null;
  if (!tool) notFound();
  const initialConfig = await getToolConfigForPage(slug);
  return <Home slug={slug} initialConfig={initialConfig} />;
}
