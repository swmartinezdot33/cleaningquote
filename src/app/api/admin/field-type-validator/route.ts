import { NextRequest, NextResponse } from 'next/server';
import { validateFieldTypeCompatibility, getCompatibleSurveyTypes, validateAllFieldMappings } from '@/lib/survey/field-type-validator';
import { getGHLToken, getGHLLocationId } from '@/lib/kv';
import { requireAdminAuth } from '@/lib/security/auth';

/**
 * GET - Validate field type compatibility
 * Query: surveyFieldType (e.g., 'text'), ghlFieldMapping (e.g., 'custom_field_123')
 * 
 * POST - Validate all field mappings
 * Body: { questions: [{id, type, label, ghlFieldMapping}] }
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surveyFieldType = searchParams.get('surveyFieldType');
    const ghlFieldMapping = searchParams.get('ghlFieldMapping');

    if (!surveyFieldType) {
      return NextResponse.json(
        { error: 'surveyFieldType query parameter is required' },
        { status: 400 }
      );
    }

    const validation = await validateFieldTypeCompatibility(surveyFieldType, ghlFieldMapping || undefined);

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Error validating field type:', error);
    return NextResponse.json(
      { error: 'Failed to validate field type compatibility' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const body = await request.json();

    if (body.action === 'validate-all') {
      // Validate all field mappings
      const { questions } = body;
      if (!Array.isArray(questions)) {
        return NextResponse.json(
          { error: 'questions must be an array' },
          { status: 400 }
        );
      }

      const report = await validateAllFieldMappings(questions);
      return NextResponse.json({ success: true, report });
    }

    if (body.action === 'get-compatible-types') {
      // Get compatible survey types for a GHL field
      const { ghlFieldMapping } = body;
      const compatibleTypes = await getCompatibleSurveyTypes(ghlFieldMapping);
      return NextResponse.json({ success: true, compatibleTypes });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in field type validator:', error);
    return NextResponse.json(
      { error: 'Failed to validate field types' },
      { status: 500 }
    );
  }
}
