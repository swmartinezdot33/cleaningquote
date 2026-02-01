import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/security/auth';
import {
  getWidgetSettings,
  getFormSettings,
  getTrackingCodes,
  getGHLConfig,
  getGHLToken,
  getGHLLocationId,
  ghlTokenExists,
} from '@/lib/kv';

/**
 * GET /api/admin/settings-bundle
 * Returns widget, form, tracking, and GHL config (and token status) in one request for faster settings page load.
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const [widget, form, tracking, ghlConfig, token, locationId, tokenExists] = await Promise.all([
      getWidgetSettings(),
      getFormSettings(),
      getTrackingCodes(),
      getGHLConfig(),
      getGHLToken(),
      getGHLLocationId(),
      ghlTokenExists(),
    ]);

    return NextResponse.json({
      widget: widget || {
        title: 'Get Your Quote',
        subtitle: "Let's get your professional cleaning price!",
        primaryColor: '#7c3aed',
      },
      form: form || {},
      tracking: tracking || {},
      ghlConfig: ghlConfig || null,
      ghl: {
        configured: tokenExists,
        maskedToken: token ? `****${token.slice(-4)}` : null,
        locationId: locationId || null,
      },
    });
  } catch (error) {
    console.error('Error getting settings bundle:', error);
    return NextResponse.json(
      {
        error: 'Failed to load settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
