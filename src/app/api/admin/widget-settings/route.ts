import { NextRequest, NextResponse } from 'next/server';
import { getKV } from '@/lib/kv';

const WIDGET_SETTINGS_KEY = 'widget:settings';

/**
 * Authenticate request with admin password
 */
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

/**
 * GET - Retrieve widget settings
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    try {
      const kv = getKV();
      const settings = await kv.get(WIDGET_SETTINGS_KEY);

      if (!settings) {
        // Return defaults
        return NextResponse.json({
          title: 'Raleigh Cleaning Company',
          subtitle: "Let's get your professional cleaning price!",
        });
      }

      return NextResponse.json(settings);
    } catch (kvError) {
      // KV not configured in local dev
      return NextResponse.json({
        title: 'Raleigh Cleaning Company',
        subtitle: "Let's get your professional cleaning price!",
      });
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
    const { title, subtitle } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required and must be a string' }, { status: 400 });
    }

    if (!subtitle || typeof subtitle !== 'string') {
      return NextResponse.json(
        { error: 'Subtitle is required and must be a string' },
        { status: 400 }
      );
    }

    try {
      const kv = getKV();
      await kv.set(WIDGET_SETTINGS_KEY, { title, subtitle });

      return NextResponse.json({
        success: true,
        message: 'Widget settings saved successfully',
        settings: { title, subtitle },
      });
    } catch (kvError) {
      console.warn('KV not configured, settings not persisted:', kvError);
      return NextResponse.json({
        success: true,
        message: 'Widget settings updated (not persisted - KV not configured)',
        settings: { title, subtitle },
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
