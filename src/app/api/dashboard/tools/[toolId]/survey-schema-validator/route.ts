import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { validateQuestion, checkFieldChangeImpact, validateSurveySchema } from '@/lib/survey/schema-validator';
import { getSurveyQuestions } from '@/lib/survey/manager';

export const dynamic = 'force-dynamic';

/** POST - Validate survey changes for this tool */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { action } = body;

    const questions = await getSurveyQuestions(toolId);

    if (action === 'validate') {
      const { question } = body;
      const result = validateQuestion(question, questions, true);

      return NextResponse.json({
        success: true,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
      });
    }

    if (action === 'check-impact') {
      const { fieldId, oldQuestion, newQuestion } = body;
      const currentQuestion = questions.find((q) => q.id === fieldId);

      const impact = checkFieldChangeImpact(fieldId, currentQuestion, newQuestion);

      return NextResponse.json({
        success: true,
        fieldId,
        breaking: impact.breaking,
        impact: impact.impact,
        affectedSystems: impact.affectedSystems,
        recommendation: impact.breaking
          ? '⚠️ This change would break existing functionality. Consider reverting.'
          : '✓ Safe to apply',
      });
    }

    if (action === 'validate-batch') {
      const { newQuestions } = body;
      const result = validateSurveySchema(newQuestions, questions);

      return NextResponse.json({
        success: true,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        breakingChanges: result.breakingChanges,
        summary: `${result.errors.length} error(s), ${result.warnings.length} warning(s), ${result.breakingChanges.length} breaking change(s)`,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Dashboard survey-schema-validator:', error);
    return NextResponse.json(
      { error: 'Failed to validate schema', details: String(error) },
      { status: 500 }
    );
  }
}
