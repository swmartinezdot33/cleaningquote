import { NextRequest, NextResponse } from 'next/server';
import type { ToolInsert } from '@/lib/supabase/types';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { createSupabaseServer } from '@/lib/supabase/server';
import { slugToSafe } from '@/lib/supabase/tools';
import { canAccessTool } from '@/lib/org-auth';
import * as configStore from '@/lib/config/store';
import { DEFAULT_WIDGET } from '@/lib/tools/config';
import { DEFAULT_SURVEY_QUESTIONS } from '@/lib/survey/schema';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const orgId = body.org_id;
    if (!orgId || typeof orgId !== 'string') {
      return NextResponse.json({ error: 'Organization is required' }, { status: 400 });
    }

    const allowed = await canAccessTool(user.id, user.email ?? undefined, orgId);
    if (!allowed) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

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

    const insert: ToolInsert = { org_id: orgId, user_id: user.id, name: name || slug, slug };
    // Use service role for insert so RLS never blocks: we already verified access with canAccessTool. Ensures every "Create quoting tool" adds a row to tools.
    const insertClient = createSupabaseServer();
    const { data: tool, error } = await insertClient
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

    const toolId = (tool as { id: string }).id;
    try {
      await configStore.createToolConfigPreset(toolId, DEFAULT_WIDGET, DEFAULT_SURVEY_QUESTIONS);
    } catch (configErr) {
      console.error('Tool created but failed to seed default config:', configErr);
      // Still return success; tool exists, user can configure in settings
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
