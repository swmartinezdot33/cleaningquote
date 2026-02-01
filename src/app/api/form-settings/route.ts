import { NextRequest, NextResponse } from 'next/server';
import { getFormSettings } from '@/lib/kv';

/**
 * GET /api/form-settings
 * Retrieve form parameter mappings (public endpoint for quote page)
 */
export async function GET(request: NextRequest) {
  try {
    const formSettings = await getFormSettings();

    return NextResponse.json({
      formSettings: formSettings || {},
    });
  } catch (error) {
    console.error('Error getting form settings:', error);
    return NextResponse.json(
      { formSettings: {} },
      { status: 200 }
    );
  }
}
