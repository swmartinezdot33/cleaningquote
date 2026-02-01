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

/** Server-side: get full tool config by tool id (unambiguous). Returns null if KV unavailable. */
export async function getToolConfigByToolId(toolId: string): Promise<ToolConfig | null> {
  try {
    const [widgetSettings, formSettings, questions, ghlConfig] = await Promise.all([
      getWidgetSettings(toolId),
      getFormSettings(toolId),
      getSurveyQuestions(toolId),
      getGHLConfig(toolId),
    ]);

    return {
      widget: widgetSettings ?? { title: 'Get Your Quote', subtitle: "Let's get your price!", primaryColor: '#7c3aed' },
      formSettings: formSettings ?? {},
      questions: questions ?? [],
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

/** Brand purple – default/fallback primary color across the app */
export const DEFAULT_PRIMARY_COLOR = '#7c3aed';

/**
 * Server-side: get primary color for quote/summary page first paint (avoids flash of wrong color).
 * @param slug - When provided (e.g. /t/[slug]/quote/[id]), use that tool's widget color; otherwise admin default.
 */
export async function getQuotePagePrimaryColor(slug?: string): Promise<string> {
  try {
    if (slug) {
      const config = await getToolConfigForPage(slug);
      return config?.widget?.primaryColor ?? DEFAULT_PRIMARY_COLOR;
    }
    const settings = await getWidgetSettings(undefined);
    return settings?.primaryColor ?? DEFAULT_PRIMARY_COLOR;
  } catch {
    return DEFAULT_PRIMARY_COLOR;
  }
}
