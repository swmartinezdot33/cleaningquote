import { NextRequest, NextResponse } from 'next/server';
import { getSurveyQuestions } from '@/lib/kv';

/**
 * GET - Retrieve survey questions (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const questions = await getSurveyQuestions();

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error('Error getting survey questions:', error);
    return NextResponse.json(
      {
        success: false,
        questions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
