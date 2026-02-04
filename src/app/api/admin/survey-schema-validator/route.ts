import { NextRequest, NextResponse } from 'next/server';
import { validateSurveySchema, checkFieldChangeImpact, validateQuestion } from '@/lib/survey/schema-validator';
import { SurveyQuestion } from '@/lib/survey/schema';
import { getSurveyQuestions } from '@/lib/survey/manager';
import { requireAdminAuth } from '@/lib/security/auth';

/**
 * GET: Validate current survey schema
 * 
 * Usage:
 * - `/api/admin/survey-schema-validator` - Validate full schema
 * - `/api/admin/survey-schema-validator?fieldId=serviceType` - Check specific field
 */
export async function GET(request: NextRequest) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get('fieldId');

    const questions = await getSurveyQuestions();

    if (fieldId) {
      // Validate specific field
      const question = questions.find(q => q.id === fieldId);
      if (!question) {
        return NextResponse.json(
          { error: `Field "${fieldId}" not found` },
          { status: 404 }
        );
      }

      const result = validateQuestion(question, questions);
      return NextResponse.json({
        success: true,
        fieldId,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        question,
      });
    } else {
      // Validate full schema
      const result = validateSurveySchema(questions);
      return NextResponse.json({
        success: true,
        valid: result.valid,
        errors: result.errors,
        warnings: result.warnings,
        breakingChanges: result.breakingChanges,
        totalQuestions: questions.length,
        criticalFieldsPresent: questions.filter(q => q.isCoreField).length,
      });
    }
  } catch (error) {
    console.error('Schema validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate schema', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST: Validate changes before applying them
 * 
 * Body:
 * - action: 'validate' | 'check-impact' | 'validate-batch'
 * - question: (for 'validate') The question to validate
 * - fieldId: (for 'check-impact') The field being changed
 * - oldQuestion: (for 'check-impact') The current version
 * - newQuestion: (for 'check-impact') The proposed changes
 * - questions: (for 'validate-batch') Array of questions to validate
 */
export async function POST(request: NextRequest) {
  const authResponse = await requireAdminAuth(request);
  if (authResponse) return authResponse;

  try {
    const body = await request.json();
    const { action } = body;

    const questions = await getSurveyQuestions();

    if (action === 'validate') {
      // Validate a single question
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
      // Check impact of changing a field
      const { fieldId, oldQuestion, newQuestion } = body;
      const currentQuestion = questions.find(q => q.id === fieldId);
      
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
      // Validate multiple questions at once
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

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Schema validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate schema', details: String(error) },
      { status: 500 }
    );
  }
}
