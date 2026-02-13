import { createSupabaseServer } from '@/lib/supabase/server';
import { getWidgetSettings, getFormSettings, getGHLConfig } from '@/lib/kv';
import { getSurveyQuestions } from '@/lib/survey/manager';
import type { Tool } from '@/lib/supabase/types';

export interface ToolConfig {
  widget: { title: string; subtitle: string; primaryColor: string };
  formSettings: Record<string, unknown>;
  questions: Array<{
    id: string;
    label: string;
    type: string;
    placeholder?: string;
    required: boolean;
    options?: Array<{ value: string; label: string }>;
    order: number;
    ghlFieldMapping?: string;
  }>;
  redirect: { redirectAfterAppointment: boolean; appointmentRedirectUrl: string };
}

/** Preset widget settings seeded when a tool is created. Never use global/other-org fallback. */
export const DEFAULT_WIDGET = { title: 'Get Your Quote', subtitle: "Let's get your price!", primaryColor: '#7c3aed' };

/** Server-side: get full tool config by tool id. Tool-only; no global fallback. Use tool's settings or in-code defaults. */
export async function getToolConfigByToolId(toolId: string): Promise<ToolConfig | null> {
  try {
    const [widgetSettings, formSettings, questions, ghlConfig] = await Promise.all([
      getWidgetSettings(toolId),
      getFormSettings(toolId),
      getSurveyQuestions(toolId),
      getGHLConfig(toolId),
    ]);
    const toolWidget = widgetSettings ?? null;
    return {
      widget: {
        title: toolWidget?.title ?? '',
        subtitle: toolWidget?.subtitle ?? '',
        primaryColor: toolWidget?.primaryColor ?? DEFAULT_PRIMARY_COLOR,
      },
      formSettings: formSettings ?? {},
      questions: Array.isArray(questions) ? questions : [],
      redirect: ghlConfig
        ? {
            redirectAfterAppointment: ghlConfig.redirectAfterAppointment === true,
            appointmentRedirectUrl: ghlConfig.appointmentRedirectUrl ?? '',
          }
        : { redirectAfterAppointment: false, appointmentRedirectUrl: '' },
    };
  } catch {
    return null;
  }
}

/** Server-side: get full tool config for a slug. Uses service role so public pages can load tool config. */
export async function getToolConfigForPage(slug: string): Promise<ToolConfig | null> {
  try {
    const supabase = createSupabaseServer();
    const { data } = await supabase.from('tools').select('id').eq('slug', slug).single();
    const tool = data as Tool | null;
    if (!tool) return null;
    return getToolConfigByToolId(tool.id);
  } catch {
    return null;
  }
}

/** Server-side: get full tool config for org-scoped route /t/[orgSlug]/[toolSlug]. */
export async function getToolConfigForOrgTool(orgSlug: string, toolSlug: string): Promise<ToolConfig | null> {
  try {
    const supabase = createSupabaseServer();
    const { data: org } = await supabase.from('organizations').select('id').eq('slug', orgSlug).single();
    if (!org) return null;
    const orgId = (org as { id: string }).id;
    const { data: tool } = await supabase.from('tools').select('id').eq('org_id', orgId).eq('slug', toolSlug).single();
    if (!tool) return null;
    return getToolConfigByToolId((tool as Tool).id);
  } catch {
    return null;
  }
}

/** Brand purple – default/fallback primary color across the app */
export const DEFAULT_PRIMARY_COLOR = '#7c3aed';

export { normalizeHexColor } from '@/lib/utils/color';

/**
 * Server-side: get primary color for quote/summary page first paint (avoids flash of wrong color).
 * Tool-only: when slug provided use that tool's color; otherwise use brand default. No global fallback.
 */
export async function getQuotePagePrimaryColor(slug?: string): Promise<string> {
  try {
    if (slug) {
      const config = await getToolConfigForPage(slug);
      return config?.widget?.primaryColor ?? DEFAULT_PRIMARY_COLOR;
    }
    return 'transparent';
  } catch {
    return 'transparent';
  }
}
