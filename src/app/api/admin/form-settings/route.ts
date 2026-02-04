import { NextRequest, NextResponse } from 'next/server';
import { getFormSettings, setFormSettings } from '@/lib/kv';
import { requireAdminAuth } from '@/lib/security/auth';

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
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const formSettings = await getFormSettings();

    return NextResponse.json({
      formSettings: (formSettings as FormSettings) || {},
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
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

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

    await setFormSettings(formSettings as Record<string, unknown>);

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
