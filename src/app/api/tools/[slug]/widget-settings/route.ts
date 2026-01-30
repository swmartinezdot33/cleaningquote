import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getWidgetSettings } from '@/lib/kv';
import type { Tool } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

/** GET - Public widget settings for a tool by slug */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }
    const supabase = await createSupabaseServerSSR();
    const { data } = await supabase.from('tools').select('id').eq('slug', slug).single();
    const tool = data as Tool | null;
    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }
    const settings = await getWidgetSettings(tool.id);
    return NextResponse.json(
      settings ?? {
        title: 'Get Your Quote',
        subtitle: "Let's get your price!",
        primaryColor: '#0d9488',
      }
    );
  } catch (err) {
    console.error('GET /api/tools/[slug]/widget-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get widget settings' },
      { status: 500 }
    );
  }
}
