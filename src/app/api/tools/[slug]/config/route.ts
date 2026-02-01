import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { Tool, ToolConfigRow } from '@/lib/supabase/types';
import { DEFAULT_SURVEY_QUESTIONS } from '@/lib/survey/schema';

export const dynamic = 'force-dynamic';

const DEFAULT_WIDGET = { title: 'Get Your Quote', subtitle: "Let's get your price!", primaryColor: '#7c3aed' };

/** GET - Public config bundle. Reads tool_config directly from Supabase (no kv/config layer) so config always matches DB. */
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

    const { data: tool, error: toolErr } = await supabase.from('tools').select('id').eq('slug', slug).single();
    if (toolErr || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }
    const toolId = (tool as Tool).id;

    const { data: rowData, error: rowErr } = await supabase
      .from('tool_config')
      .select('*')
      .eq('tool_id', toolId)
      .maybeSingle();

    if (rowErr) {
      console.error('GET /api/tools/[slug]/config tool_config read:', rowErr);
      return NextResponse.json({ error: 'Config read failed' }, { status: 500 });
    }

    const row = rowData as ToolConfigRow | null;

    // Only global fallback: site customization primary color. All other settings are tool-scoped (no global GHL, analytics, form, questions).
    const { data: globalData } = await supabase
      .from('tool_config')
      .select('widget_settings')
      .is('tool_id', null)
      .maybeSingle();

    const globalRow = globalData as Pick<ToolConfigRow, 'widget_settings'> | null;

    type WidgetShape = { title?: string; subtitle?: string; primaryColor?: string };
    const toolWidget: WidgetShape | null =
      row?.widget_settings && typeof row.widget_settings === 'object' && !Array.isArray(row.widget_settings)
        ? (row.widget_settings as WidgetShape)
        : null;
    const globalPrimaryColor =
      globalRow?.widget_settings && typeof globalRow.widget_settings === 'object' && !Array.isArray(globalRow.widget_settings)
        ? (globalRow.widget_settings as WidgetShape).primaryColor ?? null
        : null;
    const widget = {
      title: toolWidget?.title ?? DEFAULT_WIDGET.title,
      subtitle: toolWidget?.subtitle ?? DEFAULT_WIDGET.subtitle,
      primaryColor: toolWidget?.primaryColor ?? globalPrimaryColor ?? DEFAULT_WIDGET.primaryColor,
    };

    const formSettings =
      row?.form_settings && typeof row.form_settings === 'object' ? row.form_settings : {};
    // Use tool's questions if present; otherwise fall back to default survey so the form loads (e.g. existing tools created before defaults-at-creation).
    const toolQuestions = Array.isArray(row?.survey_questions) && row.survey_questions.length > 0 ? row.survey_questions : [];
    const questions = toolQuestions.length > 0 ? toolQuestions : DEFAULT_SURVEY_QUESTIONS;

    type GhlRedirectShape = { redirectAfterAppointment?: boolean; appointmentRedirectUrl?: string };
    const ghl: GhlRedirectShape | null =
      row?.ghl_config && typeof row.ghl_config === 'object' && !Array.isArray(row.ghl_config)
        ? (row.ghl_config as GhlRedirectShape)
        : null;
    const redirect = ghl
      ? {
          redirectAfterAppointment: ghl.redirectAfterAppointment === true,
          appointmentRedirectUrl: ghl.appointmentRedirectUrl ?? '',
        }
      : { redirectAfterAppointment: false, appointmentRedirectUrl: '' };

    const googleMapsKey =
      typeof row?.google_maps_key === 'string' && row.google_maps_key.length > 0
        ? row.google_maps_key
        : null;

    const trackingCodes =
      row?.tracking_codes && typeof row.tracking_codes === 'object'
        ? (row.tracking_codes as { customHeadCode?: string })
        : {};

    return NextResponse.json(
      { widget, formSettings, questions, redirect, googleMapsKey, trackingCodes },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
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
