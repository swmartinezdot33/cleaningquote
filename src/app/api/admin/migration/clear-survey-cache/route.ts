import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import * as configStore from '@/lib/config/store';
import { getKV } from '@/lib/kv';

const SURVEY_QUESTIONS_KEY = 'survey:questions';

/**
 * EMERGENCY MIGRATION: Clear survey questions cache (Supabase or KV)
 * This forces the system to regenerate default questions with correct field types
 */
export async function POST(request: NextRequest) {
  try {
    if (isSupabaseConfigured()) {
      console.log('🔄 MIGRATION: Clearing survey questions from Supabase config...');
      await configStore.setSurveyQuestionsInConfig([], undefined);
      console.log('✅ MIGRATION: Survey questions cleared (Supabase)');
    } else {
      console.log('🔄 MIGRATION: Clearing survey questions cache from Vercel KV...');
      const kv = getKV();
      await kv.del(SURVEY_QUESTIONS_KEY);
      console.log('✅ MIGRATION: Survey questions cache cleared (KV)');
    }

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
 * GET endpoint to check migration status and manually trigger if needed
 */
export async function GET(request: NextRequest) {
  try {
    if (isSupabaseConfigured()) {
      const questions = await configStore.getSurveyQuestionsFromConfig(undefined);
      const cacheExists = Array.isArray(questions) && questions.length > 0;
      return NextResponse.json({
        cacheExists,
        message: cacheExists ? 'Survey questions exist in Supabase config' : 'Survey questions are empty. Default questions will be used.',
        ...(cacheExists && { cachedQuestions: questions, action: 'POST to this endpoint with Bearer token to clear' }),
      });
    }

    const kv = getKV();
    const exists = await kv.exists(SURVEY_QUESTIONS_KEY);
    if (exists === 1) {
      const questions = await kv.get(SURVEY_QUESTIONS_KEY);
      return NextResponse.json({
        cacheExists: true,
        message: 'Survey questions cache exists',
        cachedQuestions: questions,
        action: 'POST to this endpoint with Bearer token to clear cache',
      });
    }
    return NextResponse.json({
      cacheExists: false,
      message: 'Survey questions cache is already empty. Default questions will be used.',
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
