import { NextResponse } from 'next/server';
import { getDashboardUserAndToolWithClient } from '@/lib/dashboard-auth';
import { getKV, toolKey } from '@/lib/kv';
import { slugToSafe } from '@/lib/supabase/tools';

const KV_KEYS_TO_COPY = [
  'widget:settings',
  'admin:form-settings',
  'survey:questions',
  'survey:questions:v2',
  'pricing:file:2026',
  'pricing:network:path',
  'ghl:api:token',
  'ghl:location:id',
  'ghl:config',
  'service:area:polygon',
  'service:area:network:link',
];

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await params;
  const result = await getDashboardUserAndToolWithClient(toolId);
  if (result instanceof NextResponse) return result;

  const { tool, supabase } = result;

  let baseSlug = slugToSafe(tool.slug + '-copy') || tool.slug + '-copy';
  let slug = baseSlug;
  let attempts = 0;
  while (attempts < 20) {
    const { data: existing } = await supabase
      .from('tools')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    attempts++;
    slug = `${baseSlug}-${attempts}`;
  }

  const name = `Copy of ${tool.name}`;

  const { data: newTool, error: insertErr } = await supabase
    .from('tools')
    .insert({ org_id: tool.org_id, name, slug } as any)
    .select()
    .single();

  if (insertErr || !newTool) {
    return NextResponse.json(
      { error: insertErr?.message ?? 'Failed to create cloned tool' },
      { status: 500 }
    );
  }

  const newId = (newTool as { id: string }).id;

  try {
    const kv = getKV();
    for (const key of KV_KEYS_TO_COPY) {
      const srcKey = toolKey(toolId, key);
      const val = await kv.get(srcKey);
      if (val !== null && val !== undefined) {
        const destKey = toolKey(newId, key);
        await kv.set(destKey, val);
      }
    }
    const metadataKey = toolKey(toolId, 'pricing:file:2026:metadata');
    const meta = await kv.get(metadataKey);
    if (meta !== null && meta !== undefined) {
      await kv.set(toolKey(newId, 'pricing:file:2026:metadata'), meta);
    }
  } catch (kvErr) {
    console.warn('Clone: KV copy partial failure (tool created):', kvErr);
  }

  return NextResponse.json({ tool: newTool });
}
