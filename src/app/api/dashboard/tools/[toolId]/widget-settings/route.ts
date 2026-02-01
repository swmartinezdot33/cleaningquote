import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getWidgetSettings } from '@/lib/kv';
import { createSupabaseServer } from '@/lib/supabase/server';
import { DEFAULT_PRIMARY_COLOR, normalizeHexColor } from '@/lib/tools/config';

export const dynamic = 'force-dynamic';

/** GET - Get widget settings for this tool */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const settings = await getWidgetSettings(toolId);
    return NextResponse.json(
      settings ?? { title: '', subtitle: '', primaryColor: DEFAULT_PRIMARY_COLOR }
    );
  } catch (err) {
    console.error('GET dashboard widget-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get widget settings' },
      { status: 500 }
    );
  }
}

/** POST - Save widget settings for this tool. Uses service-role client directly so write always persists (no RLS). */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { title, subtitle, primaryColor } = body;

    const titleStr = typeof title === 'string' ? title : '';
    const subtitleStr = typeof subtitle === 'string' ? subtitle : '';
    const color = normalizeHexColor(primaryColor) ?? DEFAULT_PRIMARY_COLOR;
    const widgetSettings = { title: titleStr, subtitle: subtitleStr, primaryColor: color };

    const admin = createSupabaseServer();
    const updated_at = new Date().toISOString();

    const { error: upsertError } = await admin
      .from('tool_config')
      .upsert(
        { tool_id: toolId, widget_settings: widgetSettings, updated_at },
        { onConflict: 'tool_id' }
      );

    if (upsertError) {
      console.error('POST dashboard widget-settings upsert:', upsertError);
      return NextResponse.json(
        { error: upsertError.message || 'Failed to save widget settings' },
        { status: 500 }
      );
    }

    const { data: row, error: selectError } = await admin
      .from('tool_config')
      .select('widget_settings, updated_at')
      .eq('tool_id', toolId)
      .single();

    if (selectError || !row) {
      return NextResponse.json({
        success: true,
        settings: widgetSettings,
        toolId,
        persisted: true,
        _debug: 'upsert ok, read-back failed',
      });
    }

    const raw = row.widget_settings;
    const settings =
      raw && typeof raw === 'object' && !Array.isArray(raw)
        ? {
            title: typeof (raw as any).title === 'string' ? (raw as any).title : titleStr,
            subtitle: typeof (raw as any).subtitle === 'string' ? (raw as any).subtitle : subtitleStr,
            primaryColor: normalizeHexColor((raw as any).primaryColor ?? (raw as any).primary_color) ?? color,
          }
        : widgetSettings;

    return NextResponse.json(
      {
        success: true,
        settings,
        toolId,
        persisted: true,
        _writtenPrimaryColor: settings.primaryColor,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'CDN-Cache-Control': 'no-store',
        },
      }
    );
  } catch (err) {
    console.error('POST dashboard widget-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save widget settings' },
      { status: 500 }
    );
  }
}
