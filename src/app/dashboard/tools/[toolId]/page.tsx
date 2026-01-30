import { notFound } from 'next/navigation';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import type { Tool } from '@/lib/supabase/types';
import { ToolDetailTabs } from './ToolDetailTabs';

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ toolId: string }>;
}) {
  const { toolId } = await params;
  const supabase = await createSupabaseServerSSR();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  const { data, error } = await supabase
    .from('tools')
    .select('*')
    .eq('id', toolId)
    .eq('user_id', user.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const tool = data as Tool;
  return <ToolDetailTabs tool={tool} />;
}
