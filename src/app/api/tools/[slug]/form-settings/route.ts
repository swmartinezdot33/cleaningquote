import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getFormSettings } from '@/lib/kv';
import type { Tool } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

/** GET - Public form settings for a tool by slug */
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
    const formSettings = await getFormSettings(tool.id);
    return NextResponse.json({ formSettings: formSettings ?? {} });
  } catch (err) {
    console.error('GET /api/tools/[slug]/form-settings:', err);
    return NextResponse.json(
      { formSettings: {} },
      { status: 200 }
    );
  }
}
