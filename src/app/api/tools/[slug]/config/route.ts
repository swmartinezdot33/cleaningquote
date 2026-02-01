import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { Tool, ToolConfigRow } from '@/lib/supabase/types';
import * as configStore from '@/lib/config/store';
import { DEFAULT_WIDGET } from '@/lib/tools/config';
import { DEFAULT_SURVEY_QUESTIONS } from '@/lib/survey/schema';

export const dynamic = 'force-dynamic';

/** GET - Public config bundle. Tool-only: reads this tool's tool_config. No global fallback; use tool's settings or presets from creation. */
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

    let row = rowData as ToolConfigRow | null;

    // If tool exists but has no config row (e.g. created before seed-on-creation), create one with presets so the tool loads.
    if (!row) {
      try {
        await configStore.setWidgetSettings(DEFAULT_WIDGET, toolId);
        await configStore.setSurveyQuestionsInConfig(DEFAULT_SURVEY_QUESTIONS, toolId);
        const { data: newRow, error: reErr } = await supabase
          .from('tool_config')
          .select('*')
          .eq('tool_id', toolId)
          .maybeSingle();
        if (!reErr && newRow) row = newRow as ToolConfigRow;
      } catch (initErr) {
        console.error('GET /api/tools/[slug]/config lazy init config row:', initErr);
      }
    }

    // Normalize widget_settings from DB (camelCase or snake_case). Parse if stored as JSON string.
    type WidgetShape = { title?: string; subtitle?: string; primaryColor?: string; primary_color?: string };
    const parseWidgetRaw = (raw: unknown): unknown => {
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          return null;
        }
      }
      return raw;
    };
    const normalize = (raw: unknown): { title?: string; subtitle?: string; primaryColor?: string } | null => {
      const parsed = parseWidgetRaw(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      const o = parsed as Record<string, unknown>;
      return {
        title: typeof o.title === 'string' ? o.title : undefined,
        subtitle: typeof o.subtitle === 'string' ? o.subtitle : undefined,
        primaryColor:
          typeof o.primaryColor === 'string'
            ? o.primaryColor
            : typeof (o as WidgetShape).primary_color === 'string'
              ? (o as WidgetShape).primary_color
              : undefined,
      };
    };
    const toolWidget = normalize(row?.widget_settings);
    const widget = {
      title: toolWidget?.title ?? '',
      subtitle: toolWidget?.subtitle ?? '',
      primaryColor: toolWidget?.primaryColor ?? 'transparent',
    };

    const formSettings =
      row?.form_settings && typeof row.form_settings === 'object' ? row.form_settings : {};
    let rawQuestions = row?.survey_questions;

    /** Parse survey_questions from DB: array, JSON string (single or double-encoded), or object with .questions / .data array. */
    function parseSurveyQuestions(raw: unknown): unknown[] {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try {
          const first = JSON.parse(raw) as unknown;
          if (Array.isArray(first)) return first;
          if (first && typeof first === 'object' && !Array.isArray(first)) {
            const o = first as Record<string, unknown>;
            if (Array.isArray(o.questions)) return o.questions;
            if (Array.isArray(o.data)) return o.data;
          }
          // Double-encoded: first parse gave a string
          if (typeof first === 'string') {
            try {
              const second = JSON.parse(first) as unknown;
              return Array.isArray(second) ? second : [];
            } catch {
              return [];
            }
          }
          return [];
        } catch {
          return [];
        }
      }
      if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
        const o = raw as Record<string, unknown>;
        if (Array.isArray(o.questions)) return o.questions;
        if (Array.isArray(o.data)) return o.data;
      }
      return [];
    }
    let questions: unknown[] = parseSurveyQuestions(rawQuestions);

    // Row exists but we got no questions — try config store (same parsing as dashboard) in case DB shape differs.
    if (row && questions.length === 0) {
      const fromStore = await configStore.getSurveyQuestionsFromConfig(toolId);
      if (fromStore && Array.isArray(fromStore) && fromStore.length > 0) {
        questions = fromStore;
      }
    }

    // Row exists but survey_questions was never set (null/undefined) — seed defaults so the form loads. Only leave [] when explicitly stored as [].
    if (row && questions.length === 0 && (rawQuestions === null || rawQuestions === undefined)) {
      try {
        await configStore.setSurveyQuestionsInConfig(DEFAULT_SURVEY_QUESTIONS, toolId);
        const { data: updated } = await supabase
          .from('tool_config')
          .select('survey_questions')
          .eq('tool_id', toolId)
          .maybeSingle();
        const q = (updated as { survey_questions?: unknown } | null)?.survey_questions;
        questions = Array.isArray(q) ? q : typeof q === 'string' ? (() => {
          try {
            const p = JSON.parse(q);
            return Array.isArray(p) ? p : DEFAULT_SURVEY_QUESTIONS;
          } catch {
            return DEFAULT_SURVEY_QUESTIONS;
          }
        })() : DEFAULT_SURVEY_QUESTIONS;
      } catch (seedErr) {
        console.error('GET /api/tools/[slug]/config seed null survey_questions:', seedErr);
      }
    }

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
      {
        widget,
        formSettings,
        questions,
        redirect,
        googleMapsKey,
        trackingCodes,
        _meta: { toolId, slug, configUpdatedAt: row?.updated_at ?? null },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0',
          'X-Tool-Id': toolId,
          'X-Tool-Slug': slug,
          'X-Config-Updated': row?.updated_at ?? '',
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
