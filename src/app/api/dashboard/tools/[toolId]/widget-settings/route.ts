import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getWidgetSettings, setWidgetSettings } from '@/lib/kv';

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
      settings ?? {
        title: 'Get Your Quote',
        subtitle: "Let's get your price!",
        primaryColor: '#7c3aed',
      }
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

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }
    if (!subtitle || typeof subtitle !== 'string') {
      return NextResponse.json({ error: 'Subtitle is required' }, { status: 400 });
    }

    const color = primaryColor && /^#[0-9A-F]{6}$/i.test(primaryColor) ? primaryColor : '#7c3aed';
    await setWidgetSettings({ title, subtitle, primaryColor: color }, toolId);

    return NextResponse.json({
      success: true,
      settings: { title, subtitle, primaryColor: color },
    });
  } catch (err) {
    console.error('POST dashboard widget-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save widget settings' },
      { status: 500 }
    );
  }
}
