import { createSupabaseServerSSR } from '@/lib/supabase/server-ssr';
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

/** Server-side: get full tool config for a slug. Returns null if tool not found or KV unavailable. */
export async function getToolConfigForPage(slug: string): Promise<ToolConfig | null> {
  try {
    const supabase = await createSupabaseServerSSR();
    const { data } = await supabase.from('tools').select('id').eq('slug', slug).single();
    const tool = data as Tool | null;
    if (!tool) return null;

    const [widgetSettings, formSettings, questions, ghlConfig] = await Promise.all([
      getWidgetSettings(tool.id),
      getFormSettings(tool.id),
      getSurveyQuestions(tool.id),
      getGHLConfig(tool.id),
    ]);

    return {
      widget: widgetSettings ?? { title: 'Get Your Quote', subtitle: "Let's get your price!", primaryColor: '#0d9488' },
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
