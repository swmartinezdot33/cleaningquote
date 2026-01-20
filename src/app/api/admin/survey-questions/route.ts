import { NextRequest, NextResponse } from 'next/server';
import { storeSurveyQuestions, getSurveyQuestions, SurveyQuestion } from '@/lib/kv';

/**
 * Authenticate request with admin password
 */
function authenticate(request: NextRequest): NextResponse | null {
  const password = request.headers.get('x-admin-password');
  const requiredPassword = process.env.ADMIN_PASSWORD;

  if (requiredPassword && password !== requiredPassword) {
    return NextResponse.json(
      { error: 'Unauthorized. Invalid or missing password.' },
      { status: 401 }
    );
  }
  return null;
}

/**
 * GET - Retrieve survey questions
 */
export async function GET(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const questions = await getSurveyQuestions();

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('Error getting survey questions:', error);
    return NextResponse.json(
      {
        error: 'Failed to get survey questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Save survey questions
 */
export async function POST(request: NextRequest) {
  try {
    const authResponse = authenticate(request);
    if (authResponse) return authResponse;

    const body = await request.json();
    const { questions } = body;

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Questions must be an array' },
        { status: 400 }
      );
    }

    // Validate each question
    for (const question of questions) {
      if (!question.id || typeof question.id !== 'string') {
        return NextResponse.json(
          { error: 'Each question must have a valid id' },
          { status: 400 }
        );
      }
      if (!question.label || typeof question.label !== 'string') {
        return NextResponse.json(
          { error: 'Each question must have a valid label' },
          { status: 400 }
        );
      }
      if (!['text', 'email', 'tel', 'number', 'select'].includes(question.type)) {
        return NextResponse.json(
          { error: 'Invalid question type. Must be: text, email, tel, number, or select' },
          { status: 400 }
        );
      }
      if (question.type === 'select' && (!question.options || !Array.isArray(question.options))) {
        return NextResponse.json(
          { error: 'Select questions must have an options array' },
          { status: 400 }
        );
      }
      if (typeof question.required !== 'boolean') {
        return NextResponse.json(
          { error: 'Each question must have a required boolean field' },
          { status: 400 }
        );
      }
      if (typeof question.order !== 'number') {
        return NextResponse.json(
          { error: 'Each question must have an order number' },
          { status: 400 }
        );
      }
    }

    // Store questions
    await storeSurveyQuestions(questions as SurveyQuestion[]);

    return NextResponse.json({
      success: true,
      message: 'Survey questions saved successfully',
      questions,
    });
  } catch (error) {
    console.error('Error saving survey questions:', error);
    return NextResponse.json(
      {
        error: 'Failed to save survey questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
