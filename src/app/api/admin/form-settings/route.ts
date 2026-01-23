import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const FORM_SETTINGS_KEY = 'admin:form-settings';

export interface FormSettings {
  firstNameParam?: string;
  lastNameParam?: string;
  emailParam?: string;
  phoneParam?: string;
  addressParam?: string;
  openSurveyInNewTab?: boolean;
}

/**
 * GET /api/admin/form-settings
 * Retrieve form parameter mappings
 */
export async function GET(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password');
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formSettings = await kv.get<FormSettings>(FORM_SETTINGS_KEY);

    return NextResponse.json({
      formSettings: formSettings || {},
    });
  } catch (error) {
    console.error('Error getting form settings:', error);
    return NextResponse.json(
      { error: 'Failed to get form settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/form-settings
 * Save form parameter mappings
 */
export async function POST(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password');
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      firstNameParam,
      lastNameParam,
      emailParam,
      phoneParam,
      addressParam,
      openSurveyInNewTab,
    } = body;

    // Build form settings object (only include non-empty values)
    const formSettings: FormSettings = {};

    if (firstNameParam?.trim()) formSettings.firstNameParam = firstNameParam.trim();
    if (lastNameParam?.trim()) formSettings.lastNameParam = lastNameParam.trim();
    if (emailParam?.trim()) formSettings.emailParam = emailParam.trim();
    if (phoneParam?.trim()) formSettings.phoneParam = phoneParam.trim();
    if (addressParam?.trim()) formSettings.addressParam = addressParam.trim();
    if (typeof openSurveyInNewTab === 'boolean') formSettings.openSurveyInNewTab = openSurveyInNewTab;

    await kv.set(FORM_SETTINGS_KEY, formSettings);

    return NextResponse.json({
      success: true,
      message: 'Form settings saved successfully',
    });
  } catch (error) {
    console.error('Error saving form settings:', error);
    return NextResponse.json(
      { error: 'Failed to save form settings' },
      { status: 500 }
    );
  }
}
