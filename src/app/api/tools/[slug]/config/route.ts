import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
import { getWidgetSettings, getFormSettings, getGHLConfig } from '@/lib/kv';
import { getSurveyQuestions } from '@/lib/survey/manager';
import type { Tool } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

/** GET - Public config bundle (widget + form + survey + redirect) for a tool by slug */
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
    const [widgetSettings, formSettings, questions, ghlConfig] = await Promise.all([
      getWidgetSettings(tool.id),
      getFormSettings(tool.id),
      getSurveyQuestions(tool.id),
      getGHLConfig(tool.id),
    ]);
    return NextResponse.json({
      widget: widgetSettings ?? { title: 'Get Your Quote', subtitle: "Let's get your price!", primaryColor: '#0d9488' },
      formSettings: formSettings ?? {},
      questions,
      redirect: ghlConfig
        ? {
            redirectAfterAppointment: ghlConfig.redirectAfterAppointment === true,
            appointmentRedirectUrl: ghlConfig.appointmentRedirectUrl ?? '',
          }
        : { redirectAfterAppointment: false, appointmentRedirectUrl: '' },
    });
  } catch (err) {
    console.error('GET /api/tools/[slug]/config:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get config' },
      { status: 500 }
    );
  }
}
