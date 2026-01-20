import { NextRequest, NextResponse } from 'next/server';
import { getSurveyQuestions } from '@/lib/kv';

/**
 * GET - Retrieve survey questions (public endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    let questions = await getSurveyQuestions();

    // MANDATORY FIXES: Ensure critical fields are always correct type and options
    questions = questions.map(q => {
      // Fix: squareFeet MUST be a select with range options
      if (q.id === 'squareFeet') {
        return {
          ...q,
          type: 'select',
          options: [
            { value: '500-1000', label: 'Under 1,000 sq ft' },
            { value: '1000-1500', label: '1,000 - 1,500 sq ft' },
            { value: '1500-2000', label: '1,500 - 2,000 sq ft' },
            { value: '2000-2500', label: '2,000 - 2,500 sq ft' },
            { value: '2500-3000', label: '2,500 - 3,000 sq ft' },
            { value: '3000-3500', label: '3,000 - 3,500 sq ft' },
            { value: '3500-4000', label: '3,500 - 4,000 sq ft' },
            { value: '4000-4500', label: '4,000 - 4,500 sq ft' },
            { value: '4500+', label: 'Over 4,500 sq ft' },
          ],
        };
      }
      
      // Fix: halfBaths MUST have 0 as an option
      if (q.id === 'halfBaths' && q.type === 'select') {
        const options = q.options || [];
        const hasZero = options.some(o => o.value === '0');
        if (!hasZero) {
          return {
            ...q,
            options: [
              { value: '0', label: '0' },
              ...options,
            ],
          };
        }
      }
      
      // Fix: sheddingPets MUST have 0 as an option
      if (q.id === 'sheddingPets' && q.type === 'select') {
        const options = q.options || [];
        const hasZero = options.some(o => o.value === '0');
        if (!hasZero) {
          return {
            ...q,
            options: [
              { value: '0', label: '0' },
              ...options,
            ],
          };
        }
      }
      
      return q;
    });

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
