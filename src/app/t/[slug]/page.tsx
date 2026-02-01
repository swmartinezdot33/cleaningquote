import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
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
  
  // Get all tools with this slug (could be multiple orgs using same slug)
  const { data: tools } = await supabase.from('tools').select('id, org_id, slug').eq('slug', slug);
  const list = (tools ?? []) as Array<{ id: string; org_id: string; slug: string }>;
  
  if (list.length === 0) notFound();
  
  // If multiple tools have this slug, try to pick the right one by matching org's custom domain to request host
  let tool: { id: string; org_id: string; slug: string } | undefined = list[0];
  
  if (list.length > 1) {
    // Multiple tools with same slug - disambiguate by matching request host to tool's custom domain
    const headersList = await headers();
    const host = headersList.get('host') ?? '';
    
    // Get form_settings for all matching tools to check publicBaseUrls
    const { data: configs } = await supabase
      .from('tool_config')
      .select('tool_id, form_settings')
      .in('tool_id', list.map(t => t.id));
    
    const configList = (configs ?? []) as Array<{ tool_id: string; form_settings: any }>;
    
    // Find tool whose publicBaseUrls includes this host
    for (const t of list) {
      const cfg = configList.find(c => c.tool_id === t.id);
      const formSettings = cfg?.form_settings;
      const publicBaseUrls = Array.isArray(formSettings?.publicBaseUrls) ? formSettings.publicBaseUrls : [];
      
      // Check if any publicBaseUrl matches the current host
      const matchesHost = publicBaseUrls.some((url: string) => {
        try {
          const u = new URL(url);
          return u.hostname === host;
        } catch {
          return false;
        }
      });
      
      if (matchesHost) {
        tool = t;
        break;
      }
    }
    
    // If no domain match, use first tool (fallback)
    if (!tool || !list.find(t => t.id === tool?.id)) {
      tool = list[0];
    }
  }
  
  if (!tool) notFound();
  const initialConfig = await getToolConfigByToolId(tool.id);
  return <Home slug={slug} toolId={tool.id} initialConfig={initialConfig ?? undefined} />;
}
