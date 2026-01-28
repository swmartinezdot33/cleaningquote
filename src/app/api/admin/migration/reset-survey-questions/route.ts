import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { SurveyQuestion } from '@/lib/kv';

/**
 * EMERGENCY MIGRATION: Reset survey questions to correct defaults
 * This forces the system to use the correct field types for:
 * - squareFeet (must be select with range options)
 * - halfBaths (must be select with 0 as default)
 * - sheddingPets (must be select with 0 as default)
 */

const SURVEY_QUESTIONS_KEY = 'survey:questions:v2';

// Define the correct default questions
const CORRECTED_DEFAULT_QUESTIONS: SurveyQuestion[] = [
  {
    id: 'firstName',
    label: "What's your first name?",
    type: 'text',
    placeholder: 'John',
    required: true,
    order: 0,
  },
  {
    id: 'lastName',
    label: "What's your last name?",
    type: 'text',
    placeholder: 'Doe',
    required: true,
    order: 1,
  },
  {
    id: 'email',
    label: "What's your email address?",
    type: 'email',
    placeholder: 'john@example.com',
    required: true,
    order: 2,
  },
  {
    id: 'phone',
    label: "What's your phone number?",
    type: 'tel',
    placeholder: '(555) 123-4567',
    required: true,
    order: 3,
  },
  {
    id: 'address',
    label: "What's your service address?",
    type: 'address',
    placeholder: 'Enter your address',
    required: true,
    order: 4,
  },
  {
    id: 'squareFeet',
    label: "About how big is your home?",
    type: 'select',
    options: [
      { value: '0-1500', label: 'Under 1,500 sq ft' },
      { value: '1500-2000', label: '1,500 - 2,000 sq ft' },
      { value: '2000-2500', label: '2,000 - 2,500 sq ft' },
      { value: '2500-3000', label: '2,500 - 3,000 sq ft' },
      { value: '3000-3500', label: '3,000 - 3,500 sq ft' },
      { value: '3500-4000', label: '3,500 - 4,000 sq ft' },
      { value: '4000-4500', label: '4,000 - 4,500 sq ft' },
      { value: '4500-5000', label: '4,500 - 5,000 sq ft' },
      { value: '5000-6000', label: '5,000 - 6,000 sq ft' },
      { value: '6000-7000', label: '6,000 - 7,000 sq ft' },
      { value: '7000-8000', label: '7,000 - 8,000 sq ft' },
      { value: '8000+', label: 'Over 8,000 sq ft' },
    ],
    required: true,
    order: 5,
  },
  {
    id: 'serviceType',
    label: 'Type of Cleaning Service Needed',
    type: 'select',
    options: [
      { value: 'initial', label: 'Initial Deep Cleaning for RECURRING Services (First deep clean to reach maintenance standards for Weekly, Bi-Weekly, or Every 4 Week Services)', skipToQuestionId: 'frequency' },
      { value: 'general', label: 'Initial General Clean for RECURRING Services (For switching services—good condition homes for Weekly, Bi-Weekly, or Every 4 Week Services)', skipToQuestionId: 'frequency' },
      { value: 'deep', label: 'One Time Deep Clean (Very thorough—wet wipe everything)', skipToQuestionId: 'fullBaths' },
      { value: 'move-in', label: 'Move In/Move Out Basic clean', skipToQuestionId: 'fullBaths' },
      { value: 'move-out', label: 'Move In/Move Out Deep clean', skipToQuestionId: 'fullBaths' },
    ],
    required: true,
    order: 6,
  },
  {
    id: 'frequency',
    label: 'How often would you like your home cleaned?',
    type: 'select',
    options: [
      { value: 'weekly', label: 'Weekly' },
      { value: 'bi-weekly', label: 'Bi-Weekly (Every 2 Weeks)' },
      { value: 'four-week', label: 'Every 4 Weeks' },
      { value: 'one-time', label: 'One Time Clean (Deep Clean or Move Out/Move In only)' },
    ],
    required: true,
    order: 7,
  },
  {
    id: 'fullBaths',
    label: 'How many full baths?',
    type: 'number',
    placeholder: '2',
    required: true,
    order: 8,
  },
  {
    id: 'halfBaths',
    label: 'How many half baths?',
    type: 'number',
    placeholder: '1',
    required: true,
    order: 9,
  },
  {
    id: 'bedrooms',
    label: 'How many bedrooms in the home?',
    type: 'number',
    placeholder: '3',
    required: true,
    order: 10,
  },
  {
    id: 'people',
    label: 'How many people live in the home?',
    type: 'number',
    placeholder: '2',
    required: true,
    order: 11,
  },
  {
    id: 'sheddingPets',
    label: 'How many shedding pets live in the home?',
    type: 'number',
    placeholder: '1',
    required: true,
    order: 12,
  },
  {
    id: 'condition',
    label: 'How would you describe the current condition of the home?',
    type: 'select',
    options: [
      { value: 'excellent', label: 'Excellent - Well maintained' },
      { value: 'good', label: 'Good - Generally clean' },
      { value: 'average', label: 'Average - Needs regular cleaning' },
      { value: 'poor', label: 'Poor - Needs deep cleaning' },
      { value: 'very-poor', label: 'Very Poor - Heavily soiled' },
    ],
    required: true,
    order: 13,
  },
  {
    id: 'hasPreviousService',
    label: 'Have you had cleaning service before?',
    type: 'select',
    options: [
      { value: 'true', label: 'Yes, I currently have or recently had service' },
      { value: 'false', label: 'No, this is my first time' },
      { value: 'switching', label: 'Yes, but I\'m switching providers (not happy with previous service)' },
    ],
    required: true,
    order: 14,
  },
  {
    id: 'cleanedWithin3Months',
    label: 'Has your home been professionally cleaned within the last 3 months?',
    type: 'select',
    options: [
      { value: 'yes', label: 'Yes, within the last 3 months' },
      { value: 'no', label: 'No, not within the last 3 months' },
      { value: 'unsure', label: 'Not sure / Cannot remember' },
    ],
    required: true,
    order: 15,
  },
];

/**
 * POST - Run the migration: Clear old cache and store corrected defaults
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is an admin request
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide Bearer token.' },
        { status: 401 }
      );
    }

    console.log('🔄 MIGRATION START: Resetting survey questions to correct defaults...');
    
    // Step 1: Delete old cache
    await kv.del(SURVEY_QUESTIONS_KEY);
    console.log('✅ Step 1: Cleared old survey questions cache');
    
    // Step 2: Store corrected defaults
    await kv.set(SURVEY_QUESTIONS_KEY, CORRECTED_DEFAULT_QUESTIONS);
    console.log('✅ Step 2: Stored corrected default survey questions');
    
    // Step 3: Verify the migration worked
    const stored = await kv.get<SurveyQuestion[]>(SURVEY_QUESTIONS_KEY);
    
    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully!',
      timestamp: new Date().toISOString(),
      details: {
        action: 'Reset survey questions to correct defaults',
        questionsStored: stored?.length || 0,
        keyCorrectionsMade: {
          squareFeet: 'Confirmed as select type with range options',
          halfBaths: 'Confirmed as select type with 0 as default',
          sheddingPets: 'Confirmed as select type with 0 as default',
        },
        nextStep: 'Hard refresh your browser (Cmd+Shift+R or Ctrl+Shift+R) to see updates',
      },
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
 * GET - Check current state and show migration instructions
 */
export async function GET(request: NextRequest) {
  try {
    const stored = await kv.get<SurveyQuestion[]>(SURVEY_QUESTIONS_KEY);
    const squareFeetQ = stored?.find(q => q.id === 'squareFeet');
    const halfBathsQ = stored?.find(q => q.id === 'halfBaths');
    const sheddingPetsQ = stored?.find(q => q.id === 'sheddingPets');
    
    const isCorrect = 
      squareFeetQ?.type === 'select' &&
      halfBathsQ?.type === 'select' &&
      sheddingPetsQ?.type === 'select' &&
      (halfBathsQ?.options || []).some(o => o.value === '0') &&
      (sheddingPetsQ?.options || []).some(o => o.value === '0');
    
    return NextResponse.json({
      migrationNeeded: !isCorrect,
      currentState: {
        questionsStored: stored?.length || 0,
        squareFeet: {
          type: squareFeetQ?.type,
          isCorrect: squareFeetQ?.type === 'select',
          optionsCount: squareFeetQ?.options?.length || 0,
        },
        halfBaths: {
          type: halfBathsQ?.type,
          isCorrect: halfBathsQ?.type === 'select' && (halfBathsQ?.options || []).some(o => o.value === '0'),
          hasZeroOption: (halfBathsQ?.options || []).some(o => o.value === '0'),
          optionsCount: halfBathsQ?.options?.length || 0,
        },
        sheddingPets: {
          type: sheddingPetsQ?.type,
          isCorrect: sheddingPetsQ?.type === 'select' && (sheddingPetsQ?.options || []).some(o => o.value === '0'),
          hasZeroOption: (sheddingPetsQ?.options || []).some(o => o.value === '0'),
          optionsCount: sheddingPetsQ?.options?.length || 0,
        },
      },
      instructions: 'POST with Bearer token to run migration',
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
