import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * GET /api/form-settings
 * Retrieve form parameter mappings (public endpoint for quote page)
 */
export async function GET(request: NextRequest) {
  try {
    const formSettings = await kv.get('admin:form-settings');

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
