import { NextRequest, NextResponse } from 'next/server';
import type { ToolInsert } from '@/lib/supabase/types';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { slugToSafe } from '@/lib/supabase/tools';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const slugRaw = typeof body.slug === 'string' ? body.slug.trim() : '';
    const slug = slugToSafe(slugRaw || name || 'tool');

    if (!slug) {
      return NextResponse.json({ error: 'Name or slug is required' }, { status: 400 });
    }

    const { data: existing } = await supabase.from('tools').select('id').eq('slug', slug).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: `Slug "${slug}" is already in use` }, { status: 400 });
    }

    const insert: ToolInsert = { user_id: user.id, name: name || slug, slug };
    const { data: tool, error } = await supabase
      .from('tools')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(insert as any)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!tool) {
      return NextResponse.json({ error: 'Failed to create tool' }, { status: 500 });
    }

    return NextResponse.json({ tool });
  } catch (err) {
    console.error('POST /api/dashboard/tools:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
