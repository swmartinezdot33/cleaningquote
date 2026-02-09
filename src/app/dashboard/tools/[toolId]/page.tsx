import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { canAccessTool } from '@/lib/org-auth';
import * as configStore from '@/lib/config/store';
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

  const admin = createSupabaseServer();
  const { data, error } = await admin.from('tools').select('*').eq('id', toolId).single();
  if (error || !data) notFound();
  const tool = data as Tool;

  let allowed = false;
  if (user) {
    allowed = await canAccessTool(user.id, user.email ?? undefined, tool.org_id);
  } else {
    const cookieStore = await cookies();
    const locationId = cookieStore.get('ghl_location_id')?.value ?? null;
    if (locationId) {
      const orgIds = await configStore.getOrgIdsByGHLLocationId(locationId);
      allowed = orgIds.includes(tool.org_id);
    }
  }
  if (!allowed) notFound();

  // Org slug for unambiguous embed URLs (/t/orgSlug/toolSlug) so quotes always associate to this org
  let orgSlug: string | null = null;
  const { data: org } = await admin.from('organizations').select('slug').eq('id', tool.org_id).single();
  if (org && typeof (org as { slug?: string }).slug === 'string') {
    orgSlug = (org as { slug: string }).slug;
  }

  return <ToolDetailTabs tool={tool} orgSlug={orgSlug} />;
}
