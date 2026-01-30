import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getSurveyQuestions } from '@/lib/survey/manager';
import type { Tool } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

/** GET - Public survey questions for a tool by slug */
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
    const questions = await getSurveyQuestions(tool.id);
    return NextResponse.json({ success: true, questions });
  } catch (err) {
    console.error('GET /api/tools/[slug]/survey-questions:', err);
    return NextResponse.json(
      { success: false, questions: [], error: err instanceof Error ? err.message : 'Failed to get questions' },
      { status: 500 }
    );
  }
}
