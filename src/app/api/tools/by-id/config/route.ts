import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import type { Tool, ToolConfigRow } from '@/lib/supabase/types';
import * as configStore from '@/lib/config/store';
import { DEFAULT_WIDGET, DEFAULT_PRIMARY_COLOR, normalizeHexColor } from '@/lib/tools/config';
import { DEFAULT_SURVEY_QUESTIONS } from '@/lib/survey/schema';

export const dynamic = 'force-dynamic';

/** Short hash of Supabase URL so we can verify dashboard and public API use same DB. */
function getDbRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return createHash('sha256').update(url).digest('hex').slice(0, 8);
}

/**
 * GET - Public config by tool ID (unambiguous).
 * Path /api/tools/by-id/config avoids [slug] matching "config" and returning 404.
 * Use ?toolId=xxx so the widget always loads the exact tool's config.
 */
export async function GET(request: NextRequest) {
  try {
    const toolId = request.nextUrl.searchParams.get('toolId');
    if (!toolId || typeof toolId !== 'string' || !toolId.trim()) {
      return NextResponse.json({ error: 'toolId query param required' }, { status: 400 });
    }
    const id = toolId.trim();
    const supabase = createSupabaseServer();

    const { data: tool, error: toolErr } = await supabase.from('tools').select('id, slug').eq('id', id).single();
    if (toolErr || !tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }
    const slug = (tool as Tool & { slug?: string }).slug ?? '';

    const { data: rowData, error: rowErr } = await supabase
      .from('tool_config')
      .select('*')
      .eq('tool_id', id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (rowErr) {
      console.error('GET /api/tools/by-id/config tool_config read:', rowErr);
      return NextResponse.json({ error: 'Config read failed' }, { status: 500 });
    }

    let row = rowData as ToolConfigRow | null;

    if (!row) {
      try {
        await configStore.createToolConfigPreset(id, DEFAULT_WIDGET, DEFAULT_SURVEY_QUESTIONS);
        const { data: newRow, error: reErr } = await supabase
          .from('tool_config')
          .select('*')
          .eq('tool_id', id)
          .maybeSingle();
        if (!reErr && newRow) row = newRow as ToolConfigRow;
      } catch (initErr) {
        console.error('GET /api/tools/by-id/config lazy init config row:', initErr);
      }
    }

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
    const primaryColor = normalizeHexColor(toolWidget?.primaryColor) ?? DEFAULT_PRIMARY_COLOR;
    const widget = {
      title: toolWidget?.title ?? '',
      subtitle: toolWidget?.subtitle ?? '',
      primaryColor,
    };

    const formSettings =
      row?.form_settings && typeof row.form_settings === 'object' ? row.form_settings : {};
    let rawQuestions = row?.survey_questions;

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

    if (row && questions.length === 0) {
      const fromStore = await configStore.getSurveyQuestionsFromConfig(id);
      if (fromStore && Array.isArray(fromStore) && fromStore.length > 0) {
        questions = fromStore;
      }
    }

    if (row && questions.length === 0 && (rawQuestions === null || rawQuestions === undefined)) {
      try {
        await configStore.setSurveyQuestionsInConfig(DEFAULT_SURVEY_QUESTIONS, id);
        const { data: updated } = await supabase
          .from('tool_config')
          .select('survey_questions')
          .eq('tool_id', id)
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
        console.error('GET /api/tools/by-id/config seed null survey_questions:', seedErr);
      }
    }

    if (questions.length === 0) {
      questions = [...DEFAULT_SURVEY_QUESTIONS];
    }

    // Normalize select options so imageUrl/showLabel are always present for the quote flow (preserves condition images).
    questions = (questions as Array<Record<string, unknown>>).map((q) => {
      if (q.type !== 'select' || !Array.isArray(q.options)) return q;
      const opts = (q.options as Array<Record<string, unknown>>).map((opt) => {
        const imageUrl = typeof opt.imageUrl === 'string' ? opt.imageUrl.trim() : typeof (opt as { image_url?: string }).image_url === 'string' ? String((opt as { image_url: string }).image_url).trim() : undefined;
        const showLabel = opt.showLabel !== false;
        return { ...opt, value: opt.value, label: opt.label ?? opt.value, imageUrl: imageUrl || undefined, showLabel };
      });
      return { ...q, options: opts };
    });

    type GhlRedirectShape = { redirectAfterAppointment?: boolean; appointmentRedirectUrl?: string; formIsIframed?: boolean };
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

    const responseTs = Date.now();
    return NextResponse.json(
      {
        widget,
        formSettings,
        questions,
        redirect,
        formIsIframed: ghl?.formIsIframed === true,
        googleMapsKey,
        trackingCodes,
        _meta: {
          toolId: id,
          slug,
          configUpdatedAt: row?.updated_at ?? null,
          _ts: responseTs,
        },
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
          'CDN-Cache-Control': 'no-store',
          'Vercel-CDN-Cache-Control': 'no-store',
          Pragma: 'no-cache',
          Expires: '0',
          'X-Tool-Id': id,
          'X-Tool-Slug': slug,
          'X-Config-Updated': row?.updated_at ?? '',
          'X-DB-Ref': getDbRef(),
          'X-Response-Time': String(responseTs),
        },
      }
    );
  } catch (err) {
    console.error('GET /api/tools/by-id/config:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get config' },
      { status: 500 }
    );
  }
}
