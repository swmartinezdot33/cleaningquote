import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getWidgetSettings, setWidgetSettings } from '@/lib/kv';
import { DEFAULT_PRIMARY_COLOR } from '@/lib/tools/config';

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

/** POST - Save widget settings for this tool */
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
    const color = primaryColor && /^#[0-9A-Fa-f]{6}$/.test(primaryColor) ? primaryColor : DEFAULT_PRIMARY_COLOR;
    const toSave = { title: titleStr, subtitle: subtitleStr, primaryColor: color };

    await setWidgetSettings(toSave, toolId);

    const written = await getWidgetSettings(toolId);
    const actual = written ?? toSave;

    return NextResponse.json({
      success: true,
      settings: actual,
      toolId,
      persisted: !!written,
    });
  } catch (err) {
    console.error('POST dashboard widget-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save widget settings' },
      { status: 500 }
    );
  }
}
