import { NextRequest, NextResponse } from 'next/server';
import { getSurveyQuestions } from '@/lib/survey/manager';
import { SurveyQuestion } from '@/lib/survey/schema';
import { requireAdminAuth } from '@/lib/security/auth';

/**
 * GET - Test field mappings configuration
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = await requireAdminAuth(request);
    if (authResponse) return authResponse;

    const surveyQuestions = await getSurveyQuestions();
    
    // Check which questions have mappings
    const questionsWithMappings = surveyQuestions.filter(q => q.ghlFieldMapping && q.ghlFieldMapping.trim() !== '');
    const questionsWithoutMappings = surveyQuestions.filter(q => !q.ghlFieldMapping || q.ghlFieldMapping.trim() === '');
    
    // Build mapping summary
    const mappingSummary = surveyQuestions.map(q => ({
      questionId: q.id,
      questionLabel: q.label,
      questionType: q.type,
      hasMapping: !!(q.ghlFieldMapping && q.ghlFieldMapping.trim() !== ''),
      ghlFieldMapping: q.ghlFieldMapping || null,
      sanitizedId: q.id.replace(/\./g, '_'),
    }));

    return NextResponse.json({
      success: true,
      summary: {
        totalQuestions: surveyQuestions.length,
        questionsWithMappings: questionsWithMappings.length,
        questionsWithoutMappings: questionsWithoutMappings.length,
        mappingPercentage: surveyQuestions.length > 0 
          ? Math.round((questionsWithMappings.length / surveyQuestions.length) * 100) 
          : 0,
      },
      questionsWithMappings: questionsWithMappings.map(q => ({
        id: q.id,
        sanitizedId: q.id.replace(/\./g, '_'),
        label: q.label,
        ghlFieldMapping: q.ghlFieldMapping,
      })),
      questionsWithoutMappings: questionsWithoutMappings.map(q => ({
        id: q.id,
        sanitizedId: q.id.replace(/\./g, '_'),
        label: q.label,
      })),
      allMappings: mappingSummary,
    });
  } catch (error) {
    console.error('Error testing field mappings:', error);
    return NextResponse.json(
      {
        error: 'Failed to test field mappings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
