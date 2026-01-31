import { notFound } from 'next/navigation';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { canAccessTool } from '@/lib/org-auth';
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
    .single();

  if (error || !data) {
    notFound();
  }

  const tool = data as Tool;
  const allowed = await canAccessTool(user.id, user.email ?? undefined, tool.org_id);
  if (!allowed) {
    notFound();
  }

  // Org slug for unambiguous embed URLs (/t/orgSlug/toolSlug) so quotes always associate to this org
  let orgSlug: string | null = null;
  const { data: org } = await supabase.from('organizations').select('slug').eq('id', tool.org_id).single();
  if (org && typeof (org as { slug?: string }).slug === 'string') {
    orgSlug = (org as { slug: string }).slug;
  }

  return <ToolDetailTabs tool={tool} orgSlug={orgSlug} />;
}
