import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * EMERGENCY MIGRATION: Clear survey questions cache from Vercel KV
 * This forces the system to regenerate default questions with correct field types
 * 
 * Use this if survey questions are stuck with old field configurations
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is an admin request
    const authHeader = request.headers.get('authorization');
    const adminPassword = request.headers.get('x-admin-password');
    
    // Accept either Bearer token or x-admin-password header
    const hasAuth = authHeader?.startsWith('Bearer ') || adminPassword;
    if (!hasAuth) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide Bearer token or x-admin-password header.' },
        { status: 401 }
      );
    }

    const SURVEY_QUESTIONS_KEY = 'survey:questions';
    
    console.log('🔄 MIGRATION: Clearing survey questions cache from Vercel KV...');
    
    // Delete the cached survey questions
    await kv.del(SURVEY_QUESTIONS_KEY);
    
    console.log('✅ MIGRATION: Survey questions cache cleared successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Survey questions cache cleared. The system will regenerate with correct field types on next request.',
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
    const SURVEY_QUESTIONS_KEY = 'survey:questions';
    
    // Check if questions exist
    const exists = await kv.exists(SURVEY_QUESTIONS_KEY);
    
    if (exists === 1) {
      const questions = await kv.get(SURVEY_QUESTIONS_KEY);
      return NextResponse.json({
        cacheExists: true,
        message: 'Survey questions cache exists',
        cachedQuestions: questions,
        action: 'POST to this endpoint with Bearer token to clear cache',
      });
    } else {
      return NextResponse.json({
        cacheExists: false,
        message: 'Survey questions cache is already empty. Default questions will be used.',
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
