import { NextRequest, NextResponse } from 'next/server';
import { getSurveyQuestions } from '@/lib/survey/manager';

/**
 * DEPRECATED: Use /api/surveys/questions instead
 * 
 * This endpoint is kept for backward compatibility.
 * It now redirects to the new unified survey API.
 */
export async function GET(request: NextRequest) {
  try {
    // Use the new unified survey manager
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
