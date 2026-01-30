import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getFormSettings, setFormSettings } from '@/lib/kv';

export const dynamic = 'force-dynamic';

/** GET - Get form settings for this tool */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const formSettings = await getFormSettings(toolId);
    return NextResponse.json({ formSettings: formSettings ?? {} });
  } catch (err) {
    console.error('GET dashboard form-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get form settings' },
      { status: 500 }
    );
  }
}

/** POST - Save form settings for this tool */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const existing = (await getFormSettings(toolId)) ?? {};
    const settings: Record<string, unknown> = { ...existing };
    const keys = [
      'firstNameParam',
      'lastNameParam',
      'emailParam',
      'phoneParam',
      'addressParam',
    ] as const;
    for (const key of keys) {
      if (body[key] != null && typeof body[key] === 'string' && body[key].trim()) {
        settings[key] = body[key].trim();
      }
    }
    if (typeof body.openSurveyInNewTab === 'boolean') {
      settings.openSurveyInNewTab = body.openSurveyInNewTab;
    }
    if (body.publicBaseUrl !== undefined) {
      settings.publicBaseUrl =
        typeof body.publicBaseUrl === 'string' && body.publicBaseUrl.trim()
          ? body.publicBaseUrl.trim()
          : undefined;
    }
    await setFormSettings(settings, toolId);
    return NextResponse.json({ success: true, message: 'Form settings saved' });
  } catch (err) {
    console.error('POST dashboard form-settings:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save form settings' },
      { status: 500 }
    );
  }
}
