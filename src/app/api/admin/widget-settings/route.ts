import { NextRequest, NextResponse } from 'next/server';
import { getWidgetSettings, setWidgetSettings } from '@/lib/kv';

function authenticate(request: NextRequest): NextResponse | null {
  const password = request.headers.get('x-admin-password');
  const requiredPassword = process.env.ADMIN_PASSWORD;
  if (requiredPassword && password !== requiredPassword) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing password.' },
      { status: 401 }
    );
  }
  return null;
}

const DEFAULT_WIDGET = {
  title: 'Get Your Quote',
  subtitle: "Let's get your professional cleaning price!",
  primaryColor: '#7c3aed',
};

/**
 * GET - Retrieve widget settings (public endpoint, no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    try {
      const settings = await getWidgetSettings();
      if (!settings) return NextResponse.json(DEFAULT_WIDGET);
      return NextResponse.json(settings);
    } catch {
      return NextResponse.json(DEFAULT_WIDGET);
    }
  } catch (error) {
    console.error('Error getting widget settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to get widget settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Save widget settings
 */
export async function POST(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { title, subtitle, primaryColor } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required and must be a string' }, { status: 400 });
    }

    if (!subtitle || typeof subtitle !== 'string') {
      return NextResponse.json(
        { error: 'Subtitle is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate color is a hex color
    const colorToUse = primaryColor || '#7c3aed';
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (!hexColorRegex.test(colorToUse)) {
      return NextResponse.json(
        { error: 'Primary color must be a valid hex color (e.g., #f61590)' },
        { status: 400 }
      );
    }

    try {
      await setWidgetSettings({ title, subtitle, primaryColor: colorToUse });
      return NextResponse.json({
        success: true,
        message: 'Widget settings saved successfully',
        settings: { title, subtitle, primaryColor: colorToUse },
      });
    } catch (kvError) {
      console.warn('Config store not available, settings not persisted:', kvError);
      return NextResponse.json({
        success: true,
        message: 'Widget settings updated (not persisted - store not configured)',
        settings: { title, subtitle, primaryColor: colorToUse },
      });
    }
  } catch (error) {
    console.error('Error saving widget settings:', error);
    return NextResponse.json(
      {
        error: 'Failed to save widget settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
