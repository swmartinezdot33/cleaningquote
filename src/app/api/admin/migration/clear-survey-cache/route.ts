import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import * as configStore from '@/lib/config/store';

const SUPABASE_REQUIRED_MSG =
  'Supabase is required for configuration. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.';

/**
 * EMERGENCY MIGRATION: Clear survey questions (Supabase only).
 * This forces the system to regenerate default questions with correct field types.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: SUPABASE_REQUIRED_MSG },
        { status: 503 }
      );
    }
    console.log('🔄 MIGRATION: Clearing survey questions from Supabase config...');
    await configStore.setSurveyQuestionsInConfig([], undefined);
    console.log('✅ MIGRATION: Survey questions cleared');

    return NextResponse.json({
      success: true,
      message: 'Survey questions cleared. The system will regenerate with correct field types on next request.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ MIGRATION ERROR:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check migration status and manually trigger if needed.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: SUPABASE_REQUIRED_MSG, cacheExists: false },
        { status: 503 }
      );
    }
    const questions = await configStore.getSurveyQuestionsFromConfig(undefined);
    const cacheExists = Array.isArray(questions) && questions.length > 0;
    return NextResponse.json({
      cacheExists,
      message: cacheExists ? 'Survey questions exist in Supabase config' : 'Survey questions are empty. Default questions will be used.',
      ...(cacheExists && { cachedQuestions: questions, action: 'POST to this endpoint with Bearer token to clear' }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
