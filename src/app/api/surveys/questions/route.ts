import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache, revalidateTag } from 'next/cache';
import {
  getSurveyQuestions,
  saveSurveyQuestions,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  resetToDefaults,
  getQuestion,
} from '@/lib/survey/manager';
import { SurveyQuestion } from '@/lib/survey/schema';

const SURVEY_QUESTIONS_CACHE_TAG = 'survey-questions';

/** Cached survey questions (15s revalidate) for faster repeat loads. */
async function getSurveyQuestionsCached(): Promise<SurveyQuestion[]> {
  return unstable_cache(
    async () => getSurveyQuestions(),
    [SURVEY_QUESTIONS_CACHE_TAG],
    { revalidate: 15, tags: [SURVEY_QUESTIONS_CACHE_TAG] }
  )();
}

/**
 * GET /api/surveys/questions
 * Get all survey questions (server-cached 15s for faster loads)
 */
export async function GET(request: NextRequest) {
  try {
    const questions = await getSurveyQuestionsCached();

    return NextResponse.json(
      {
        success: true,
        questions,
        count: questions.length,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
        },
      }
    );
  } catch (error) {
    console.error('Error getting survey questions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get survey questions',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/surveys/questions
 * Bulk save all survey questions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions, action } = body;

    const invalidateSurveyCache = () => revalidateTag(SURVEY_QUESTIONS_CACHE_TAG);

    // Handle specific actions
    if (action === 'reset') {
      const reset = await resetToDefaults();
      invalidateSurveyCache();
      return NextResponse.json({
        success: true,
        message: 'Survey reset to defaults',
        questions: reset,
      });
    }

    if (action === 'add') {
      const question = body.question as SurveyQuestion;
      const updated = await addQuestion(question);
      invalidateSurveyCache();
      return NextResponse.json({
        success: true,
        message: 'Question added',
        questions: updated,
      });
    }

    if (action === 'update') {
      const { id, updates } = body;
      const updated = await updateQuestion(id, updates);
      invalidateSurveyCache();
      return NextResponse.json({
        success: true,
        message: 'Question updated',
        questions: updated,
      });
    }

    if (action === 'delete') {
      const { id } = body;
      const updated = await deleteQuestion(id);
      invalidateSurveyCache();
      return NextResponse.json({
        success: true,
        message: 'Question deleted',
        questions: updated,
      });
    }

    if (action === 'reorder') {
      const orders = body.orders as Array<{ id: string; order: number }>;
      const updated = await reorderQuestions(orders);
      invalidateSurveyCache();
      return NextResponse.json({
        success: true,
        message: 'Questions reordered',
        questions: updated,
      });
    }

    // Default: bulk save all questions
    if (!Array.isArray(questions)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Questions must be an array',
        },
        { status: 400 }
      );
    }

    const saved = await saveSurveyQuestions(questions);
    invalidateSurveyCache();
    return NextResponse.json({
      success: true,
      message: 'Survey questions saved',
      questions: saved,
    });
  } catch (error) {
    console.error('Error saving survey questions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save survey questions',
      },
      { status: 500 }
    );
  }
}
