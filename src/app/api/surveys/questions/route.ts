import { NextRequest, NextResponse } from 'next/server';
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

/**
 * GET /api/surveys/questions
 * Get all survey questions (no-cache to always serve fresh data)
 */
export async function GET(request: NextRequest) {
  try {
    const questions = await getSurveyQuestions();
    
    return NextResponse.json(
      {
        success: true,
        questions,
        count: questions.length,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
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

    // Handle specific actions
    if (action === 'reset') {
      const reset = await resetToDefaults();
      return NextResponse.json({
        success: true,
        message: 'Survey reset to defaults',
        questions: reset,
      });
    }

    if (action === 'add') {
      const question = body.question as SurveyQuestion;
      const updated = await addQuestion(question);
      return NextResponse.json({
        success: true,
        message: 'Question added',
        questions: updated,
      });
    }

    if (action === 'update') {
      const { id, updates } = body;
      const updated = await updateQuestion(id, updates);
      return NextResponse.json({
        success: true,
        message: 'Question updated',
        questions: updated,
      });
    }

    if (action === 'delete') {
      const { id } = body;
      const updated = await deleteQuestion(id);
      return NextResponse.json({
        success: true,
        message: 'Question deleted',
        questions: updated,
      });
    }

    if (action === 'reorder') {
      const orders = body.orders as Array<{ id: string; order: number }>;
      const updated = await reorderQuestions(orders);
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
