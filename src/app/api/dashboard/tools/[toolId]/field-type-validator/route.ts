import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { validateFieldTypeCompatibility } from '@/lib/survey/field-type-validator';

export const dynamic = 'force-dynamic';

/** GET - Validate field type compatibility for this tool's GHL */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

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

    const validation = await validateFieldTypeCompatibility(
      surveyFieldType,
      ghlFieldMapping || undefined,
      toolId
    );

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Dashboard field-type-validator:', error);
    return NextResponse.json(
      { error: 'Failed to validate field type compatibility' },
      { status: 500 }
    );
  }
}
