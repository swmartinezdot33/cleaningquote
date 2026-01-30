import { NextRequest, NextResponse } from 'next/server';
import { getDashboardUserAndTool } from '@/lib/dashboard-auth';
import { getSurveyQuestions, saveSurveyQuestions } from '@/lib/survey/manager';

export const dynamic = 'force-dynamic';

/** GET - Get survey questions for this tool */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const questions = await getSurveyQuestions(toolId);
    return NextResponse.json({ success: true, questions });
  } catch (err) {
    console.error('GET dashboard survey-questions:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get survey questions' },
      { status: 500 }
    );
  }
}

/** POST - Save survey questions for this tool */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ toolId: string }> }
) {
  const { toolId } = await context.params;
  const auth = await getDashboardUserAndTool(toolId);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { questions } = body;

    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: 'Questions must be an array' }, { status: 400 });
    }

    await saveSurveyQuestions(questions, toolId);
    return NextResponse.json({ success: true, message: 'Survey questions saved' });
  } catch (err) {
    console.error('POST dashboard survey-questions:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save survey questions' },
      { status: 500 }
    );
  }
}
