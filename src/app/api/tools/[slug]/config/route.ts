import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getWidgetSettings, getFormSettings, getGHLConfig } from '@/lib/kv';
import { getSurveyQuestions } from '@/lib/survey/manager';
import type { Tool } from '@/lib/supabase/types';

export const dynamic = 'force-dynamic';

/** GET - Public config bundle (widget + form + survey + redirect) for a tool by slug. Uses service role so unauthenticated visitors can load tool config. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    if (!slug) {
      return NextResponse.json({ error: 'Slug required' }, { status: 400 });
    }
    const supabase = createSupabaseServer();
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
    // If tool has no config row (e.g. missing in production), fall back to global config so tool still gets custom settings
    const [globalWidget, globalForm, globalQuestions, globalGhl] =
      !widgetSettings && !formSettings && (!questions || questions.length === 0) && !ghlConfig
        ? await Promise.all([
            getWidgetSettings(undefined),
            getFormSettings(undefined),
            getSurveyQuestions(undefined),
            getGHLConfig(undefined),
          ])
        : [null, null, null, null];
    const widget = widgetSettings ?? globalWidget ?? { title: 'Get Your Quote', subtitle: "Let's get your price!", primaryColor: '#7c3aed' };
    const form = formSettings ?? globalForm ?? {};
    const qs = (questions && questions.length > 0) ? questions : (globalQuestions ?? []);
    const ghl = ghlConfig ?? globalGhl;
    return NextResponse.json(
      {
        widget,
        formSettings: form,
        questions: qs,
        redirect: ghl
          ? {
              redirectAfterAppointment: ghl.redirectAfterAppointment === true,
              appointmentRedirectUrl: ghl.appointmentRedirectUrl ?? '',
            }
          : { redirectAfterAppointment: false, appointmentRedirectUrl: '' },
      },
      {
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    );
  } catch (err) {
    console.error('GET /api/tools/[slug]/config:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get config' },
      { status: 500 }
    );
  }
}
